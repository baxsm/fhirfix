import {
  getEngineDeps,
  runRemediation,
  SidecarError,
  type EngineConfig,
  type MappingSuggestion,
  type RegistryMapping,
  type RemediationResult,
} from "@fhirfix/engine";
import { and, eq } from "drizzle-orm";
import { env } from "./env";
import { blobKey, blobStore, db, findingId, logger, mappingId, objectId, schema } from "./lib";

const engineConfig: EngineConfig = {
  validatorUrls: env.VALIDATOR_URL_LIST,
  validatorMaxInFlight: Number(env.VALIDATOR_MAX_INFLIGHT),
  converterUrl: env.CONVERTER_URL,
  usCoreVersion: env.US_CORE_VERSION,
};

const { deps, ensureWarm } = getEngineDeps(engineConfig);

export interface RemediationJob {
  runId: string;
  workspaceId: string;
  profiles: string[];
  autoFix: boolean;
}

// thrown so the queue marks the job failed AND the caller knows a 503 is right
// (sidecar unreachable). the run row is set to failed with the real upstream detail
// and NO credits are charged.
export class RunFailedError extends Error {
  constructor(
    message: string,
    readonly retriable: boolean,
  ) {
    super(message);
    this.name = "RunFailedError";
  }
}

async function loadMappings(workspaceId: string): Promise<RegistryMapping[]> {
  const rows = await db
    .select({
      type: schema.mappingRegistryEntry.type,
      sourceValue: schema.mappingRegistryEntry.sourceValue,
      targetValue: schema.mappingRegistryEntry.targetValue,
      targetSystem: schema.mappingRegistryEntry.targetSystem,
      status: schema.mappingRegistryEntry.status,
    })
    .from(schema.mappingRegistryEntry)
    .where(
      and(
        eq(schema.mappingRegistryEntry.workspaceId, workspaceId),
        eq(schema.mappingRegistryEntry.status, "active"),
      ),
    );
  return rows;
}

// persist auto-learned suggestions, skipping ones already suggested for this
// workspace so we don't pile up duplicates across runs.
async function persistSuggestions(
  workspaceId: string,
  suggestions: MappingSuggestion[],
): Promise<void> {
  for (const s of suggestions) {
    const existing = await db
      .select({ id: schema.mappingRegistryEntry.id })
      .from(schema.mappingRegistryEntry)
      .where(
        and(
          eq(schema.mappingRegistryEntry.workspaceId, workspaceId),
          eq(schema.mappingRegistryEntry.type, s.type),
          eq(schema.mappingRegistryEntry.sourceValue, s.sourceValue),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(schema.mappingRegistryEntry).values({
      id: mappingId(),
      workspaceId,
      type: s.type,
      sourceValue: s.sourceValue,
      targetValue: s.targetValue,
      targetSystem: s.targetSystem,
      status: "suggested",
      confidence: s.confidence,
      createdBy: "system",
    });
  }
}

async function writeFindings(
  runId: string,
  workspaceId: string,
  result: RemediationResult,
): Promise<void> {
  if (result.findings.length === 0) return;
  await db.insert(schema.finding).values(
    result.findings.map((f) => ({
      id: findingId(),
      runId,
      workspaceId,
      severity: f.severity,
      category: f.category,
      ruleSource: f.ruleSource,
      specCitation: f.specCitation,
      resourceType: f.resourceType ?? null,
      fhirpath: f.fhirpath ?? null,
      rawValidatorMessage: f.rawValidatorMessage,
      plainMessage: f.plainMessage,
      suggestedFix: f.suggestedFix,
      fixConfidence: f.fixConfidence,
      fixStatus: f.fixStatus,
      dedupFingerprint: f.dedupFingerprint,
      occurrenceCount: f.occurrenceCount,
      rank: f.rank,
    })),
  );
}

// execute one remediation job end to end. the run row is the durable source of
// truth; on sidecar failure it ends `failed` with the upstream detail, never
// stuck in `running`, and no credits are charged.
export async function executeRun(job: RemediationJob): Promise<void> {
  const { runId, workspaceId, profiles, autoFix } = job;

  await ensureWarm();

  const [runRow] = await db
    .select({ inputRef: schema.run.inputRef })
    .from(schema.run)
    .where(and(eq(schema.run.id, runId), eq(schema.run.workspaceId, workspaceId)))
    .limit(1);

  if (!runRow?.inputRef) {
    throw new RunFailedError("run has no input artifact", false);
  }

  await db
    .update(schema.run)
    .set({ status: "running" })
    .where(eq(schema.run.id, runId));

  let raw: string;
  try {
    raw = await blobStore.get(runRow.inputRef);
  } catch (err) {
    await failRun(runId, `could not read input blob: ${String(err)}`);
    throw new RunFailedError("input blob unreadable", false);
  }

  const mappings = await loadMappings(workspaceId);

  let result: RemediationResult;
  try {
    result = await runRemediation({ raw, mappings, profiles, autoFix }, deps);
  } catch (err) {
    // sidecar unreachable / timed out / circuit open: fail cleanly, no debit.
    const detail =
      err instanceof SidecarError
        ? `${err.sidecar}: ${err.message}${err.upstreamStatus ? ` (${err.upstreamStatus})` : ""}`
        : err instanceof Error
          ? err.message
          : String(err);
    await failRun(runId, detail);
    logger.error("run.execute", `${runId} failed: ${detail}`);
    // sidecar errors are retriable at the queue level; a bad-input parse is not.
    throw new RunFailedError(detail, err instanceof SidecarError);
  }

  // write the corrected artifact + track it.
  const correctedKey = blobKey(workspaceId, runId, "corrected");
  const correctedJson = JSON.stringify(result.correctedResource, null, 2);
  const { sha256, sizeBytes } = await blobStore.put(correctedKey, correctedJson, "application/json");
  await db.insert(schema.storedObject).values({
    key: correctedKey,
    workspaceId,
    bucket: "local",
    kind: "corrected",
    sizeBytes,
    contentType: "application/json",
    sha256,
    uploadState: "stored",
  });

  await writeFindings(runId, workspaceId, result);
  await persistSuggestions(workspaceId, result.suggestions);

  // a run is only completed after its artifacts are stored.
  await db
    .update(schema.run)
    .set({
      status: "completed",
      fhirVersion: result.fhirVersion,
      profilesApplied: result.profilesApplied,
      resourceCount: result.resourceCount,
      conformanceScoreBefore: result.conformanceScoreBefore,
      conformanceScoreAfter: result.conformanceScoreAfter,
      autoFixApplied: result.autoFixApplied,
      findingsTotal: result.findingsTotal,
      findingsAutoFixable: result.findingsAutoFixable,
      correctedRef: correctedKey,
      completedAt: new Date(),
    })
    .where(eq(schema.run.id, runId));

  logger.info(
    "run.execute",
    `${runId} completed: ${result.findingsTotal} findings, score ${result.conformanceScoreBefore}->${result.conformanceScoreAfter}`,
  );
}

async function failRun(runId: string, detail: string): Promise<void> {
  await db
    .update(schema.run)
    .set({ status: "failed", errorMessage: detail.slice(0, 1000), completedAt: new Date() })
    .where(eq(schema.run.id, runId));
}
