import {
  applyFixes,
  type EngineConfig,
  fixWithAi,
  getEngineDeps,
  SidecarError,
} from "@shared/engine";
import { loadActiveMappings } from "@shared/db/mappings";
import { and, eq } from "drizzle-orm";
import { env } from "./env";
import { blobKey, blobStore, db, findingId, logger, schema } from "./lib";
import { RunFailedError } from "./run-service";

const engineConfig: EngineConfig = {
  validatorUrls: env.VALIDATOR_URL_LIST,
  validatorMaxInFlight: Number(env.VALIDATOR_MAX_INFLIGHT),
  converterUrl: env.CONVERTER_URL,
  usCoreVersion: env.US_CORE_VERSION,
};

const { deps, ensureWarm } = getEngineDeps(engineConfig);

// an apply job re-runs the engine on top of a run's existing corrected artifact,
// applying either a set of deterministic fixes (by fingerprint) or one AI patch.
export interface ApplyJob {
  runId: string;
  workspaceId: string;
  kind: "deterministic" | "ai";
  fingerprints: string[]; // deterministic: one or many; ai: exactly one
  profiles: string[];
}

// replace the run's findings with the post-apply set. the report always reflects
// the current corrected artifact, so a stale "applied" row never lingers.
async function replaceFindings(
  runId: string,
  workspaceId: string,
  findings: Array<{
    severity: "error" | "warning" | "info";
    category: string;
    ruleSource: string;
    specCitation: string;
    resourceType?: string;
    fhirpath?: string;
    rawValidatorMessage: string;
    plainMessage: string;
    suggestedFix: string;
    fixConfidence: "auto" | "one_click" | "manual";
    fixStatus: "applied" | "suggested" | "skipped" | "manual_needed" | "dismissed";
    dedupFingerprint: string;
    occurrenceCount: number;
    rank: number;
  }>,
): Promise<void> {
  await db.delete(schema.finding).where(eq(schema.finding.runId, runId));
  if (findings.length === 0) return;
  await db.insert(schema.finding).values(
    findings.map((f) => ({
      id: findingId(),
      runId,
      workspaceId,
      severity: f.severity,
      category: f.category as (typeof schema.finding.$inferInsert)["category"],
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

async function writeCorrected(
  runId: string,
  workspaceId: string,
  correctedResource: unknown,
): Promise<string> {
  const key = blobKey(workspaceId, runId, "corrected");
  const json = JSON.stringify(correctedResource, null, 2);
  const { sha256, sizeBytes } = await blobStore.put(key, json, "application/json");
  // corrected key is stable per run, and blobStore.put has already created the row
  // with the bytes, so merge the metadata onto whichever row is there.
  await db
    .insert(schema.storedObject)
    .values({
      key,
      workspaceId,
      bucket: "local",
      kind: "corrected",
      sizeBytes,
      contentType: "application/json",
      sha256,
      uploadState: "stored",
    })
    .onConflictDoUpdate({
      target: schema.storedObject.key,
      set: { bucket: "local", kind: "corrected", sizeBytes, sha256, uploadState: "stored" },
    });
  return key;
}

export async function executeApply(job: ApplyJob): Promise<void> {
  const { runId, workspaceId, kind, fingerprints, profiles } = job;
  await ensureWarm();

  const [runRow] = await db
    .select({ correctedRef: schema.run.correctedRef, before: schema.run.conformanceScoreBefore })
    .from(schema.run)
    .where(and(eq(schema.run.id, runId), eq(schema.run.workspaceId, workspaceId)))
    .limit(1);

  if (!runRow?.correctedRef) {
    throw new RunFailedError("run has no corrected artifact to apply onto", false);
  }

  let corrected: string;
  try {
    corrected = await blobStore.get(runRow.correctedRef);
  } catch (err) {
    throw new RunFailedError(`corrected blob unreadable: ${String(err)}`, false);
  }

  const mappings = await loadActiveMappings(db, workspaceId);

  try {
    if (kind === "ai") {
      const fp = fingerprints[0];
      if (!fp) throw new RunFailedError("ai apply needs one fingerprint", false);
      if (!env.OPENROUTER_API_KEY) {
        throw new RunFailedError("AI fix is unavailable: no OpenRouter key configured.", false);
      }
      // pull the finding the user asked AI to help with for full context.
      const [finding] = await db
        .select({
          fhirpath: schema.finding.fhirpath,
          plainMessage: schema.finding.plainMessage,
          rawValidatorMessage: schema.finding.rawValidatorMessage,
          resourceType: schema.finding.resourceType,
        })
        .from(schema.finding)
        .where(and(eq(schema.finding.runId, runId), eq(schema.finding.dedupFingerprint, fp)))
        .limit(1);
      if (!finding) throw new RunFailedError("finding not found for ai apply", false);

      const result = await fixWithAi(
        {
          corrected,
          fingerprint: fp,
          finding,
          mappings,
          profiles,
          apiKey: env.OPENROUTER_API_KEY,
          model: env.OPENROUTER_MODEL,
        },
        deps,
      );
      await writeCorrected(runId, workspaceId, result.correctedResource);
      await replaceFindings(runId, workspaceId, result.findings);
      await db
        .update(schema.run)
        .set({
          status: "completed",
          conformanceScoreAfter: result.conformanceScoreAfter,
          findingsTotal: result.findings.length,
          findingsAutoFixable: result.findings.filter((f) => f.fixConfidence === "auto").length,
          completedAt: new Date(),
        })
        .where(eq(schema.run.id, runId));
      logger.info(
        "apply.execute",
        `${runId} ai ${result.applied ? "applied" : "declined"}: ${result.explanation.slice(0, 120)}`,
      );
      return;
    }

    const result = await applyFixes({ corrected, fingerprints, mappings, profiles }, deps);
    await writeCorrected(runId, workspaceId, result.correctedResource);
    await replaceFindings(runId, workspaceId, result.findings);
    await db
      .update(schema.run)
      .set({
        status: "completed",
        conformanceScoreAfter: result.conformanceScoreAfter,
        findingsTotal: result.findings.length,
        findingsAutoFixable: result.findings.filter((f) => f.fixConfidence === "auto").length,
        autoFixApplied: true,
        completedAt: new Date(),
      })
      .where(eq(schema.run.id, runId));
    logger.info(
      "apply.execute",
      `${runId} applied ${result.appliedFingerprints.length}/${fingerprints.length}, score -> ${result.conformanceScoreAfter}`,
    );
  } catch (err) {
    const detail =
      err instanceof SidecarError
        ? `${err.sidecar}: ${err.message}`
        : err instanceof Error
          ? err.message
          : String(err);
    await db
      .update(schema.run)
      .set({ status: "failed", errorMessage: detail.slice(0, 1000), completedAt: new Date() })
      .where(eq(schema.run.id, runId));
    logger.error("apply.execute", `${runId} failed: ${detail}`);
    throw new RunFailedError(detail, err instanceof SidecarError);
  }
}
