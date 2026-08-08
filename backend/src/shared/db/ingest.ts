import { eq } from "drizzle-orm";
import type { BlobStore } from "./blob";
import type { Db } from "./client";
import { containsPhi, redactPhi } from "./phi";
import * as schema from "./schema/index";

export type RedactionPolicy = "off" | "on_ingest" | "required";

// must default to on_ingest, never off: a missing settings row cannot mean "store PHI"
export async function redactionPolicyFor(db: Db, workspaceId: string): Promise<RedactionPolicy> {
  const [row] = await db
    .select({ policy: schema.workspaceSettings.redactionPolicy })
    .from(schema.workspaceSettings)
    .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  return (row?.policy ?? "on_ingest") as RedactionPolicy;
}

// must fall back to the workspace defaults, not [], or the setting is ignored
export async function resolveProfiles(
  db: Db,
  workspaceId: string,
  requested: string[] | undefined,
): Promise<string[]> {
  if (requested && requested.length > 0) return requested;
  const [row] = await db
    .select({ defaults: schema.workspaceSettings.defaultProfiles })
    .from(schema.workspaceSettings)
    .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  return row?.defaults ?? [];
}

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
  // set only under "required" when an unparseable payload could not be stripped
  rejected?: boolean;
};

// every ingest path must write through here or the policy and the PHI flag drift
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
    // the detector only reads fhir json, so it can claim nothing about hl7v2
    parsed = null;
  }

  const hadPhi = parsed != null && containsPhi(parsed);
  const shouldRedact = policy !== "off" && hadPhi && parsed != null;
  const effective = shouldRedact ? JSON.stringify(redactPhi(parsed), null, 2) : content;

  // unparseable under "required" cannot be proven PHI-free, so it must not be written
  if (policy === "required" && parsed == null) {
    return { key: null, content, redacted: false, hadPhi: false, rejected: true };
  }

  const { sha256, sizeBytes } = await blobStore.put(key, effective, "application/json");
  // must be stamped here or the sweep job's expiry index never matches anything
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
      // records what is on disk after redaction, not what arrived
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
