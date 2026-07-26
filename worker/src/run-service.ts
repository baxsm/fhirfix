import { loadActiveMappings, persistSuggestions } from "@shared/db/mappings";
import { persistCompletedRun } from "@shared/db/runs";
import {
  getEngineDeps,
  runRemediation,
  SidecarError,
  type EngineConfig,
  type RemediationResult,
} from "@shared/engine";
import { and, eq } from "drizzle-orm";
import { evaluateDrift } from "./drift-service";
import { env } from "./env";
import { blobKey, blobStore, db, logger, mappingId, schema } from "./lib";
import { dispatchWebhook } from "./queues";

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
    await failRun(runId, `could not read input blob: ${String(err)}`, workspaceId);
    throw new RunFailedError("input blob unreadable", false);
  }

  const mappings = await loadActiveMappings(db, workspaceId);

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
    await failRun(runId, detail, workspaceId);
    logger.error("run.execute", `${runId} failed: ${detail}`);
    // sidecar errors are retriable at the queue level; a bad-input parse is not.
    throw new RunFailedError(detail, err instanceof SidecarError);
  }

  // worker-specific: persist auto-learned mapping suggestions for later approval.
  await persistSuggestions(db, workspaceId, result.suggestions, mappingId);

  // shared completion path (db/runs.ts): write the corrected artifact, findings,
  // complete the run row, debit credits in the locked ledger tx, and fire the
  // low-balance alert. the sync REST validate/fix path uses the same function.
  const correctedKey = blobKey(workspaceId, runId, "corrected");
  const { chargeMicro, balanceAfter } = await persistCompletedRun(db, blobStore, {
    workspaceId,
    runId,
    result,
    correctedKey,
  });

  logger.info(
    "run.execute",
    `${runId} completed: ${result.findingsTotal} findings, score ${result.conformanceScoreBefore}->${result.conformanceScoreAfter}, charged ${chargeMicro} micro (balance ${balanceAfter})`,
  );

  // a scheduled run is compared against its check's baseline here, after the run
  // is already durable. a delivery problem can never leave the run unscored.
  await evaluateDrift({ runId, workspaceId }).catch((err) =>
    logger.error("drift.evaluate", `${runId}: ${err instanceof Error ? err.message : String(err)}`),
  );

  // notify subscribers. enqueued (not awaited-critical) so a webhook problem never
  // blocks the run from being marked complete.
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
}

async function failRun(runId: string, detail: string, workspaceId?: string): Promise<void> {
  await db
    .update(schema.run)
    .set({ status: "failed", errorMessage: detail.slice(0, 1000), completedAt: new Date() })
    .where(eq(schema.run.id, runId));
  if (workspaceId) {
    await dispatchWebhook({
      event: "run.failed",
      workspaceId,
      data: { runId, error: detail.slice(0, 500) },
    }).catch((err) => logger.error("webhook.dispatch", String(err)));
  }
}
