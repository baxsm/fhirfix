import { loadActiveMappings, persistSuggestions } from "@shared/db/mappings";
import { persistCompletedRun } from "@shared/db/runs";
import {
  detectInput,
  ENGINE_VERSION,
  type RemediationResult,
  runRemediation,
  SidecarError,
} from "@shared/engine";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { blobKey, blobStore } from "@/lib/blob";
import { db, schema } from "@/lib/db";
import { engineDeps, ensureEngineWarm } from "@/lib/engine";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { redactPhi } from "@/lib/phi";
import { dispatchWebhook } from "@/queues/index";
import type { ApiV1Env } from "./context";
import { apiError } from "./middleware";

const MAX_INPUT_BYTES = 5_000_000;

// map an engine finding to the public REST finding shape (no db ids, no raw
// validator echo unless the caller is authed - here they are, so raw is included).
function publicFinding(f: RemediationResult["findings"][number]) {
  return {
    severity: f.severity,
    category: f.category,
    resourceType: f.resourceType ?? null,
    fhirpath: f.fhirpath ?? null,
    ruleSource: f.ruleSource,
    specCitation: f.specCitation,
    plainMessage: f.plainMessage,
    suggestedFix: f.suggestedFix,
    fixConfidence: f.fixConfidence,
    fixStatus: f.fixStatus,
    occurrenceCount: f.occurrenceCount,
  };
}

// the shared body shape for validate/fix/convert.
interface RunBody {
  input: string;
  profiles?: string[];
  redact?: boolean;
}

// parse + guard the request body. returns the body or a typed error response.
async function readBody(
  c: Context<ApiV1Env>,
): Promise<{ ok: true; body: RunBody } | { ok: false; res: Response }> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { ok: false, res: apiError(c, 400, "bad_request", "Invalid JSON body.") };
  }
  const b = raw as Partial<RunBody>;
  if (typeof b.input !== "string" || b.input.trim() === "") {
    return { ok: false, res: apiError(c, 400, "bad_request", "`input` is required.") };
  }
  if (new TextEncoder().encode(b.input).length > MAX_INPUT_BYTES) {
    return { ok: false, res: apiError(c, 413, "too_large", "Input exceeds the 5MB limit.") };
  }
  return {
    ok: true,
    body: {
      input: b.input,
      profiles: Array.isArray(b.profiles) ? b.profiles : undefined,
      redact: b.redact === true,
    },
  };
}

// core: create a run row (source=api), run the engine synchronously, persist the
// completed run + debit via the shared path, and return the result. autoFix gates
// validate (false) vs fix (true). idempotencyKey makes it replay-safe via the
// run_idem_idx unique index: a duplicate insert returns the prior run instead of
// re-running the engine.
async function runAndPersist(
  c: Context<ApiV1Env>,
  autoFix: boolean,
): Promise<{ res?: Response; result?: RemediationResult; runId?: string; redact?: boolean }> {
  const parsed = await readBody(c);
  if (!parsed.ok) return { res: parsed.res };
  const { input, profiles, redact } = parsed.body;

  const workspaceId = c.get("workspaceId");
  const apiKeyId = c.get("apiKeyId");
  const idempotencyKey = c.get("idempotencyKey");
  const requestHash = Bun.hash(`${autoFix}:${input}`).toString(16);

  // idempotency: if this key was used before, either replay (same body) or 409
  // (different body). checked before spending anything.
  if (idempotencyKey) {
    const [prior] = await db
      .select({ id: schema.run.id, requestHash: schema.run.requestHash, status: schema.run.status })
      .from(schema.run)
      .where(
        and(eq(schema.run.workspaceId, workspaceId), eq(schema.run.idempotencyKey, idempotencyKey)),
      )
      .limit(1);
    if (prior) {
      if (prior.requestHash !== requestHash) {
        return {
          res: apiError(
            c,
            409,
            "idempotency_conflict",
            "This Idempotency-Key was already used with a different request body.",
          ),
        };
      }
      // replay: return the prior run's stored result.
      c.set("runId", prior.id);
      const replay = await loadRunResult(prior.id);
      if (replay) return { result: replay, runId: prior.id, redact };
    }
  }

  const runId = createId("run");
  const inputType = detectInput(input).inputType;
  const inputKey = blobKey(workspaceId, runId, "input");
  const { sha256, sizeBytes } = await blobStore.put(inputKey, input, "application/json");
  // blobStore.put already created the row with the bytes, so merge the metadata
  // onto it rather than inserting a second row for the same key.
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
      set: {
        bucket: "local",
        kind: "input",
        sizeBytes,
        sha256,
        containsPhi: false,
        uploadState: "stored",
      },
    });

  try {
    await db.insert(schema.run).values({
      id: runId,
      workspaceId,
      actorType: "api_key",
      actorId: apiKeyId,
      source: "api",
      inputType,
      engineVersion: ENGINE_VERSION,
      status: "running",
      profilesRequested: profiles ?? [],
      inputRef: inputKey,
      idempotencyKey: idempotencyKey ?? null,
      requestHash,
    });
  } catch {
    // a concurrent request with the same idempotency key won the unique index race.
    // return the winner's result rather than double-charging.
    const [winner] = await db
      .select({ id: schema.run.id })
      .from(schema.run)
      .where(
        and(
          eq(schema.run.workspaceId, workspaceId),
          eq(schema.run.idempotencyKey, idempotencyKey ?? ""),
        ),
      )
      .limit(1);
    if (winner) {
      c.set("runId", winner.id);
      const replay = await loadRunResult(winner.id);
      if (replay) return { result: replay, runId: winner.id, redact };
    }
    return { res: apiError(c, 409, "conflict", "Concurrent duplicate request.") };
  }

  c.set("runId", runId);

  await ensureEngineWarm();
  const mappings = await loadActiveMappings(db, workspaceId);

  let result: RemediationResult;
  try {
    result = await runRemediation({ raw: input, mappings, profiles, autoFix }, engineDeps);
  } catch (err) {
    // sidecar unreachable/timed out: mark failed, no debit, 503 with real detail.
    const detail =
      err instanceof SidecarError
        ? `${err.sidecar}: ${err.message}${err.upstreamStatus ? ` (${err.upstreamStatus})` : ""}`
        : err instanceof Error
          ? err.message
          : String(err);
    await db
      .update(schema.run)
      .set({ status: "failed", errorMessage: detail.slice(0, 1000), completedAt: new Date() })
      .where(eq(schema.run.id, runId));
    logger.error("apiv1.run", `${runId} failed: ${detail}`);
    if (err instanceof SidecarError) {
      return { res: apiError(c, 503, "sidecar_unavailable", detail) };
    }
    // a parse/shape failure is the client's input problem, not ours.
    return { res: apiError(c, 422, "unprocessable", detail) };
  }

  // the registry learns from this path too. it used to only learn from the async
  // worker, so a workspace driving everything through the sync REST api never
  // accumulated suggestions.
  await persistSuggestions(db, workspaceId, result.suggestions, () => createId("mapping"));

  const correctedKey = blobKey(workspaceId, runId, "corrected");
  await persistCompletedRun(db, blobStore, { workspaceId, runId, result, correctedKey });

  // notify subscribers for this synchronous run too (the worker fires the same
  // event for async/batch runs). enqueued, never blocks the response.
  await dispatchWebhook({
    event: "run.completed",
    workspaceId,
    data: {
      runId,
      inputType: result.inputType,
      resourceCount: result.resourceCount,
      conformanceScoreBefore: result.conformanceScoreBefore,
      conformanceScoreAfter: result.conformanceScoreAfter,
      findingsTotal: result.findingsTotal,
      findingsAutoFixable: result.findingsAutoFixable,
      reVerifiedClean: result.reVerifiedClean,
    },
  }).catch((err) => logger.error("webhook.dispatch", String(err)));

  return { result, runId, redact };
}

// rebuild a RemediationResult-like view from a stored run for idempotency replay.
async function loadRunResult(runId: string): Promise<RemediationResult | null> {
  const [row] = await db.select().from(schema.run).where(eq(schema.run.id, runId)).limit(1);
  if (row?.status !== "completed") return null;
  const findings = await db.select().from(schema.finding).where(eq(schema.finding.runId, runId));
  let corrected: unknown = null;
  if (row.correctedRef) {
    try {
      corrected = JSON.parse(await blobStore.get(row.correctedRef));
    } catch {
      corrected = null;
    }
  }
  return {
    inputType: row.inputType,
    fhirVersion: row.fhirVersion ?? "R4",
    profilesApplied: row.profilesApplied,
    resourceCount: row.resourceCount,
    conformanceScoreBefore: row.conformanceScoreBefore ?? 0,
    conformanceScoreAfter: row.conformanceScoreAfter ?? 0,
    autoFixApplied: row.autoFixApplied,
    findings: findings.map((f) => ({
      severity: f.severity,
      category: f.category,
      ruleSource: f.ruleSource,
      specCitation: f.specCitation,
      resourceType: f.resourceType ?? undefined,
      fhirpath: f.fhirpath ?? undefined,
      rawValidatorMessage: f.rawValidatorMessage,
      plainMessage: f.plainMessage,
      suggestedFix: f.suggestedFix,
      fixConfidence: f.fixConfidence,
      fixStatus: f.fixStatus,
      dedupFingerprint: f.dedupFingerprint,
      occurrenceCount: f.occurrenceCount,
      rank: f.rank,
    })),
    findingsTotal: row.findingsTotal,
    findingsAutoFixable: row.findingsAutoFixable,
    suggestions: [],
    correctedResource: corrected,
    reVerifiedClean: (row.conformanceScoreAfter ?? 0) >= 1000,
  };
}

// POST /validate - findings only, no fixes.
export async function validateController(c: Context<ApiV1Env>) {
  const { res, result, runId } = await runAndPersist(c, false);
  if (res) return res;
  if (!result || !runId) return apiError(c, 500, "internal", "Run did not complete.");
  return c.json({
    runId,
    status: "completed",
    inputType: result.inputType,
    resourceCount: result.resourceCount,
    conformanceScoreBefore: result.conformanceScoreBefore,
    findingsTotal: result.findingsTotal,
    findingsAutoFixable: result.findingsAutoFixable,
    findings: result.findings.map(publicFinding),
  });
}

// POST /fix - validate, apply safe fixes, re-verify, return the corrected artifact.
export async function fixController(c: Context<ApiV1Env>) {
  const { res, result, runId, redact } = await runAndPersist(c, true);
  if (res) return res;
  if (!result || !runId) return apiError(c, 500, "internal", "Run did not complete.");
  const output = redact ? redactPhi(result.correctedResource) : result.correctedResource;
  return c.json({
    runId,
    status: "completed",
    inputType: result.inputType,
    resourceCount: result.resourceCount,
    conformanceScoreBefore: result.conformanceScoreBefore,
    conformanceScoreAfter: result.conformanceScoreAfter,
    reVerifiedClean: result.reVerifiedClean,
    findingsTotal: result.findingsTotal,
    findingsAutoFixable: result.findingsAutoFixable,
    findings: result.findings.map(publicFinding),
    corrected: JSON.stringify(output, null, 2),
  });
}

// POST /convert - HL7v2/CCDA -> FHIR (the engine detects + converts internally),
// applying the workspace mapping registry. optionally chains fixes.
export async function convertController(c: Context<ApiV1Env>) {
  const { res, result, runId, redact } = await runAndPersist(c, true);
  if (res) return res;
  if (!result || !runId) return apiError(c, 500, "internal", "Run did not complete.");
  const output = redact ? redactPhi(result.correctedResource) : result.correctedResource;
  return c.json({
    runId,
    status: "completed",
    inputType: result.inputType,
    resourceCount: result.resourceCount,
    fhir: JSON.stringify(output, null, 2),
    findings: result.findings.map(publicFinding),
  });
}
