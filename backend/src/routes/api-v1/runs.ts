import { getRun, getRunFindings, listRuns } from "@shared/db/runs";
import { detectInput, ENGINE_VERSION } from "@shared/engine";
import type { Context } from "hono";
import { blobKey, blobStore } from "@/lib/blob";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { remediationQueue } from "@/queues/index";
import type { ApiV1Env } from "./context";
import { apiError } from "./middleware";

const MAX_INPUT_BYTES = 5_000_000;
const DEFAULT_PAGE = 25;
const MAX_PAGE = 100;

// POST /batch - submit a (potentially large) NDJSON/Bundle input as a SINGLE async
// run. returns immediately with a queued run id; completion is delivered by webhook
// or polled via GET /runs/:id. reuses the worker + remediationQueue.
export async function batchController(c: Context<ApiV1Env>) {
  let body: { input?: unknown; profiles?: unknown; autoFix?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return apiError(c, 400, "bad_request", "Invalid JSON body.");
  }
  const input = typeof body.input === "string" ? body.input : "";
  if (!input.trim()) return apiError(c, 400, "bad_request", "`input` is required.");
  if (new TextEncoder().encode(input).length > MAX_INPUT_BYTES) {
    return apiError(c, 413, "too_large", "Input exceeds the 5MB limit.");
  }

  const workspaceId = c.get("workspaceId");
  const apiKeyId = c.get("apiKeyId");
  const profiles = Array.isArray(body.profiles) ? (body.profiles as string[]) : [];
  const autoFix = body.autoFix !== false;

  const runId = createId("run");
  const inputType = detectInput(input).inputType;
  const inputKey = blobKey(workspaceId, runId, "input");
  const { sha256, sizeBytes } = await blobStore.put(inputKey, input, "application/json");
  // blobStore.put created the row with the bytes; merge the metadata onto it.
  await db
    .insert(schema.storedObject)
    .values({
      key: inputKey,
      workspaceId,
      bucket: "local",
      kind: "input",
      sizeBytes,
      contentType: "application/json",
      sha256,
      containsPhi: false,
      uploadState: "stored",
    })
    .onConflictDoUpdate({
      target: schema.storedObject.key,
      set: { bucket: "local", kind: "input", sizeBytes, sha256, uploadState: "stored" },
    });
  await db.insert(schema.run).values({
    id: runId,
    workspaceId,
    actorType: "api_key",
    actorId: apiKeyId,
    source: "api",
    inputType,
    engineVersion: ENGINE_VERSION,
    status: "queued",
    profilesRequested: profiles,
    inputRef: inputKey,
  });
  await remediationQueue.add(
    "remediate",
    { runId, workspaceId, profiles, autoFix },
    { removeOnComplete: 1000, removeOnFail: 1000 },
  );
  c.set("runId", runId);
  logger.info("apiv1.batch", `queued ${runId} (${inputType})`);
  return c.json({ runId, status: "queued" }, 202);
}

// GET /runs - cursor-paginated list with status/inputType/from/to filters. the
// cursor is the last seen createdAt (ISO); results are newest-first.
export async function listRunsController(c: Context<ApiV1Env>) {
  const workspaceId = c.get("workspaceId");
  const url = new URL(c.req.url);
  const status = url.searchParams.get("status");
  const inputType = url.searchParams.get("inputType");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const cursor = url.searchParams.get("cursor");
  const limit = Math.min(
    MAX_PAGE,
    Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_PAGE),
  );

  // cursor walks backwards: fetch rows at/older than the cursor timestamp. combined
  // with the newest-first order this pages through history one window at a time.
  const rows = await listRuns(db, {
    workspaceId,
    status: status ?? undefined,
    inputType: inputType ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    cursor: cursor ? new Date(cursor) : undefined,
    limit: limit + 1,
  });

  // the extra row tells us whether there is another page; the cursor is its ts.
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (page[page.length - 1]?.createdAt?.toISOString() ?? null) : null;

  return c.json({ runs: page, nextCursor, hasMore });
}

// GET /runs/:id - one run + its findings.
export async function getRunController(c: Context<ApiV1Env>) {
  const workspaceId = c.get("workspaceId");
  const runId = c.req.param("id") ?? "";
  const row = await getRun(db, workspaceId, runId);
  if (!row) return apiError(c, 404, "not_found", "Run not found.");

  const findings = await getRunFindings(db, runId);

  return c.json({
    run: {
      id: row.id,
      status: row.status,
      inputType: row.inputType,
      source: row.source,
      resourceCount: row.resourceCount,
      conformanceScoreBefore: row.conformanceScoreBefore,
      conformanceScoreAfter: row.conformanceScoreAfter,
      findingsTotal: row.findingsTotal,
      findingsAutoFixable: row.findingsAutoFixable,
      creditsCharged: row.creditsCharged,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    },
    findings: findings.map((f) => ({
      severity: f.severity,
      category: f.category,
      resourceType: f.resourceType,
      fhirpath: f.fhirpath,
      ruleSource: f.ruleSource,
      specCitation: f.specCitation,
      plainMessage: f.plainMessage,
      suggestedFix: f.suggestedFix,
      fixConfidence: f.fixConfidence,
      fixStatus: f.fixStatus,
      occurrenceCount: f.occurrenceCount,
    })),
  });
}

// GET /runs/:id/corrected - the corrected artifact in its original format. served
// as octet-stream with no download-disposition (anti download-manager, mirrors the
// dashboard export route).
export async function getCorrectedController(c: Context<ApiV1Env>) {
  const workspaceId = c.get("workspaceId");
  const runId = c.req.param("id") ?? "";
  const row = await getRun(db, workspaceId, runId);
  if (!row) return apiError(c, 404, "not_found", "Run not found.");
  if (!row.correctedRef)
    return apiError(c, 404, "no_artifact", "No corrected artifact for this run.");
  const body = await blobStore.get(row.correctedRef).catch(() => null);
  if (body == null) return apiError(c, 404, "no_artifact", "Corrected artifact unavailable.");
  return new Response(body, { headers: { "Content-Type": "application/octet-stream" } });
}
