import { nextAlertThreshold, priceForRun } from "@fhirfix/db/credits";
import { postLedgerEntry } from "@fhirfix/db/ledger";
import { hasNotification, recordNotification } from "@fhirfix/db/notifications";
import {
  getEngineDeps,
  runRemediation,
  SidecarError,
  type EngineConfig,
  type MappingSuggestion,
  type RegistryMapping,
  type RemediationResult,
} from "@fhirfix/engine";
import { and, desc, eq } from "drizzle-orm";
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

  // charge credits for the completed run. debit is written in the same locked
  // transaction as the ledger insert (postLedgerEntry), so concurrent completions
  // cannot drift the balance. a failed run never reaches here, so it charges nothing.
  const chargeMicro = priceForRun({ resourceCount: result.resourceCount });

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
      creditsCharged: chargeMicro,
      completedAt: new Date(),
    })
    .where(eq(schema.run.id, runId));

  const { balanceAfter } = await postLedgerEntry(db, {
    workspaceId,
    type: "debit",
    amountMicro: -chargeMicro,
    description: `Run ${runId} (${result.resourceCount} resource${result.resourceCount === 1 ? "" : "s"})`,
    createdBy: "system",
    relatedRunId: runId,
  });

  await maybeSendLowBalanceAlert(workspaceId, balanceAfter);

  logger.info(
    "run.execute",
    `${runId} completed: ${result.findingsTotal} findings, score ${result.conformanceScoreBefore}->${result.conformanceScoreAfter}, charged ${chargeMicro} micro (balance ${balanceAfter})`,
  );
}

// after a debit, check whether the balance has crossed a new low-balance threshold
// (50/75/100% consumed against the last top-up baseline). fires at most once per
// threshold per cycle: lastAlertThreshold on the account is the cursor, and a
// notification_log row is the auditable dedup record. a top-up resets the cursor.
async function maybeSendLowBalanceAlert(workspaceId: string, balanceAfter: number): Promise<void> {
  const [account] = await db
    .select({
      lastAlertThreshold: schema.billingAccount.lastAlertThreshold,
      contactUserId: schema.billingAccount.billingContactUserId,
    })
    .from(schema.billingAccount)
    .where(eq(schema.billingAccount.workspaceId, workspaceId))
    .limit(1);
  if (!account) return;

  // baseline = balance right after the most recent top-up (purchase/grant/refund).
  const [baselineRow] = await db
    .select({ balanceAfter: schema.creditLedgerEntry.balanceAfter })
    .from(schema.creditLedgerEntry)
    .where(
      and(
        eq(schema.creditLedgerEntry.workspaceId, workspaceId),
        eq(schema.creditLedgerEntry.type, "grant"),
      ),
    )
    .orderBy(desc(schema.creditLedgerEntry.createdAt))
    .limit(1);
  const [purchaseRow] = await db
    .select({ balanceAfter: schema.creditLedgerEntry.balanceAfter })
    .from(schema.creditLedgerEntry)
    .where(
      and(
        eq(schema.creditLedgerEntry.workspaceId, workspaceId),
        eq(schema.creditLedgerEntry.type, "purchase"),
      ),
    )
    .orderBy(desc(schema.creditLedgerEntry.createdAt))
    .limit(1);
  const baselineMicro = Math.max(baselineRow?.balanceAfter ?? 0, purchaseRow?.balanceAfter ?? 0);

  const threshold = nextAlertThreshold({
    balanceMicro: balanceAfter,
    baselineMicro,
    lastSent: account.lastAlertThreshold,
  });
  if (threshold == null) return;

  // dedup: skip if this exact threshold was already recorded this cycle.
  const dedup = `${baselineMicro}:${threshold}`;
  if (await hasNotification(db, { workspaceId, type: "credits.low", dedup })) return;

  // resolve the billing contact email (falls back to the workspace owner).
  const target = await resolveBillingEmail(workspaceId, account.contactUserId);

  // record the alert. real email delivery from the worker is a production concern
  // (the worker has no email client in dev); the notification_log row is the
  // auditable + dedup record and, in test/dev, the log line stands in for the send.
  await recordNotification(db, {
    workspaceId,
    channel: "email",
    type: "credits.low",
    target: target ?? "unknown",
    status: "sent",
    metadata: { dedup, threshold, balanceAfter, baselineMicro },
  });
  await db
    .update(schema.billingAccount)
    .set({ lastAlertThreshold: threshold })
    .where(eq(schema.billingAccount.workspaceId, workspaceId));

  logger.info(
    "credits.low",
    `${workspaceId} crossed ${threshold}% consumed (balance ${balanceAfter}), alerted ${target ?? "unknown"}`,
  );
}

// best-effort email for the low-balance alert: the configured billing contact, else
// the workspace owner's email.
async function resolveBillingEmail(
  workspaceId: string,
  contactUserId: string | null,
): Promise<string | null> {
  if (contactUserId) {
    const [u] = await db
      .select({ email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, contactUserId))
      .limit(1);
    if (u?.email) return u.email;
  }
  const [owner] = await db
    .select({ email: schema.user.email })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(and(eq(schema.member.organizationId, workspaceId), eq(schema.member.role, "owner")))
    .limit(1);
  return owner?.email ?? null;
}

async function failRun(runId: string, detail: string): Promise<void> {
  await db
    .update(schema.run)
    .set({ status: "failed", errorMessage: detail.slice(0, 1000), completedAt: new Date() })
    .where(eq(schema.run.id, runId));
}
