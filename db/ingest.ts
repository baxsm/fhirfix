import { eq } from "drizzle-orm";
import type { BlobStore } from "./blob";
import type { Db } from "./client";
import { containsPhi, redactPhi } from "./phi";
import * as schema from "./schema/index";

export type RedactionPolicy = "off" | "on_ingest" | "required";

// the workspace's policy, defaulting to the schema default rather than "off" so
// a missing settings row never means "store PHI".
export async function redactionPolicyFor(db: Db, workspaceId: string): Promise<RedactionPolicy> {
  const [row] = await db
    .select({ policy: schema.workspaceSettings.redactionPolicy })
    .from(schema.workspaceSettings)
    .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  return (row?.policy ?? "on_ingest") as RedactionPolicy;
}

// when this workspace's artifacts should be swept, from its retention setting.
export async function retentionExpiryFor(db: Db, workspaceId: string): Promise<Date> {
  const [row] = await db
    .select({ days: schema.workspaceSettings.dataRetentionDays })
    .from(schema.workspaceSettings)
    .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  const days = row?.days ?? 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export type StoredInput = {
  key: string | null;
  content: string;
  redacted: boolean;
  hadPhi: boolean;
  // true only under "required" when the payload could not be parsed, so PHI
  // could not be stripped and storing it would break the workspace's promise.
  rejected?: boolean;
};

// the ONE place run input is written to storage. every ingest path goes through
// here so the redaction policy and the PHI flag cannot drift between them.
//
// - off:        store as given, flag whether it carries PHI
// - on_ingest:  strip PHI, then store the redacted copy
// - required:   same, and refuse to store at all if PHI could not be stripped
//               (a non-json payload the detector cannot read)
//
// "required" deliberately still writes a REDACTED artifact rather than nothing.
// the worker is a separate process that reads the input back from storage, so
// storing nothing would either break every queued run or force the raw bytes
// through the redis job payload - which persists them somewhere far worse than
// a tracked, expiring blob. the promise "never persist PHI" is kept either way.
//
// the returned content is what the engine should validate: under on_ingest the
// engine sees the redacted copy, so a fix is never derived from PHI we promised
// to drop.
export async function storeRunInput(
  db: Db,
  blobStore: BlobStore,
  args: {
    workspaceId: string;
    key: string;
    content: string;
    policy: RedactionPolicy;
  },
): Promise<StoredInput> {
  const { workspaceId, key, content, policy } = args;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // hl7v2 and other non-json payloads are stored as-is; the detector only
    // understands fhir resources, so it cannot claim anything about them.
    parsed = null;
  }

  const hadPhi = parsed != null && containsPhi(parsed);
  const shouldRedact = policy !== "off" && hadPhi && parsed != null;
  const effective = shouldRedact ? JSON.stringify(redactPhi(parsed), null, 2) : content;

  // under "required" an unparseable payload cannot be proven PHI-free, so it is
  // not written. the caller surfaces this rather than silently storing it.
  if (policy === "required" && parsed == null) {
    return { key: null, content, redacted: false, hadPhi: false, rejected: true };
  }

  const { sha256, sizeBytes } = await blobStore.put(key, effective, "application/json");
  // stamped now so the sweep job has something to select on. without this the
  // expiry index exists but never matches anything.
  const retentionExpiresAt = await retentionExpiryFor(db, workspaceId);
  await db
    .insert(schema.storedObject)
    .values({
      key,
      workspaceId,
      bucket: "local",
      kind: "input",
      sizeBytes,
      contentType: "application/json",
      sha256,
      // after redaction the stored bytes no longer carry PHI, so this records
      // what is ON DISK, not what arrived.
      containsPhi: hadPhi && !shouldRedact,
      uploadState: "stored",
      retentionExpiresAt,
    })
    .onConflictDoUpdate({
      target: schema.storedObject.key,
      set: {
        bucket: "local",
        kind: "input",
        sizeBytes,
        sha256,
        containsPhi: hadPhi && !shouldRedact,
        uploadState: "stored",
        retentionExpiresAt,
      },
    });

  return { key, content: effective, redacted: shouldRedact, hadPhi };
}
