import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import type { BlobStore } from "./blob";
import type { Db } from "./client";
import { nextAlertThreshold, priceForRun } from "./credits";
import { postLedgerEntry } from "./ledger";
import { hasNotification, recordNotification } from "./notifications";
import * as schema from "./schema/index";

// shared run-completion path used by BOTH the worker (async queue jobs) and the
// synchronous REST controllers. it writes the corrected artifact, findings, the
// completed run row, debits credits in the same locked ledger transaction, and
// fires the low-balance alert. keeping it here (not in the worker) lets the
// backend's sync validate/fix path reuse the exact same accounting.
//
// db is decoupled from the engine package, so the result is passed structurally
// rather than importing the engine's RemediationResult type.

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);
const findingId = () => `fnd_${nano()}`;

export interface CompletedRunResult {
  inputType: string;
  fhirVersion: "R4" | "R4B" | "R5";
  profilesApplied: string[];
  resourceCount: number;
  conformanceScoreBefore: number;
  conformanceScoreAfter: number;
  autoFixApplied: boolean;
  findingsTotal: number;
  findingsAutoFixable: number;
  correctedResource: unknown;
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
  }>;
}

async function writeFindings(
  db: Db,
  runId: string,
  workspaceId: string,
  result: CompletedRunResult,
): Promise<void> {
  if (result.findings.length === 0) return;
  await db.insert(schema.finding).values(
    result.findings.map((f) => ({
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

// write the corrected artifact + track it, persist findings, complete the run row,
// debit credits in the locked ledger tx, and fire the low-balance alert. returns
// the charge and the resulting balance. a failed run never calls this, so it never
// charges. the caller supplies the actor context (ui/user vs api/api_key).
export async function persistCompletedRun(
  db: Db,
  blobStore: BlobStore,
  args: {
    workspaceId: string;
    runId: string;
    result: CompletedRunResult;
    correctedKey: string;
  },
): Promise<{ chargeMicro: number; balanceAfter: number }> {
  const { workspaceId, runId, result, correctedKey } = args;

  const correctedJson = JSON.stringify(result.correctedResource, null, 2);
  const { sha256, sizeBytes } = await blobStore.put(
    correctedKey,
    correctedJson,
    "application/json",
  );
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

  await writeFindings(db, runId, workspaceId, result);

  const chargeMicro = priceForRun({ resourceCount: result.resourceCount });

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

  await maybeSendLowBalanceAlert(db, workspaceId, balanceAfter);

  return { chargeMicro, balanceAfter };
}

// after a debit, check whether the balance crossed a new low-balance threshold
// (50/75/100% consumed against the last top-up baseline). fires at most once per
// threshold per cycle: lastAlertThreshold is the cursor, a notification_log row is
// the auditable dedup record. a top-up resets the cursor.
export async function maybeSendLowBalanceAlert(
  db: Db,
  workspaceId: string,
  balanceAfter: number,
): Promise<void> {
  const [account] = await db
    .select({
      lastAlertThreshold: schema.billingAccount.lastAlertThreshold,
      contactUserId: schema.billingAccount.billingContactUserId,
    })
    .from(schema.billingAccount)
    .where(eq(schema.billingAccount.workspaceId, workspaceId))
    .limit(1);
  if (!account) return;

  const [grantRow] = await db
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
  const baselineMicro = Math.max(grantRow?.balanceAfter ?? 0, purchaseRow?.balanceAfter ?? 0);

  const threshold = nextAlertThreshold({
    balanceMicro: balanceAfter,
    baselineMicro,
    lastSent: account.lastAlertThreshold,
  });
  if (threshold == null) return;

  const dedup = `${baselineMicro}:${threshold}`;
  if (await hasNotification(db, { workspaceId, type: "credits.low", dedup })) return;

  const target = await resolveBillingEmail(db, workspaceId, account.contactUserId);

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
}

// the billing contact email, else the workspace owner's. best-effort.
async function resolveBillingEmail(
  db: Db,
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

// run reads for the public REST API. these live in the db package (not the backend
// route file) so their drizzle queries resolve against one drizzle instance - the
// backend's route graph mixes drizzle copies and makes the query builder's column
// types collapse to `never`. the backend controllers call these thin helpers.

export interface RunListFilter {
  workspaceId: string;
  status?: string;
  inputType?: string;
  from?: Date;
  to?: Date;
  cursor?: Date;
  limit: number;
}

// a page of runs, newest first, one row past the limit so the caller can tell
// whether another page exists.
export function listRuns(db: Db, f: RunListFilter) {
  const conditions: SQL[] = [eq(schema.run.workspaceId, f.workspaceId)];
  if (f.status) conditions.push(eq(schema.run.status, f.status as "queued"));
  if (f.inputType) conditions.push(eq(schema.run.inputType, f.inputType as "fhir_json"));
  if (f.from) conditions.push(gte(schema.run.createdAt, f.from));
  if (f.to) conditions.push(lte(schema.run.createdAt, f.to));
  if (f.cursor) conditions.push(lte(schema.run.createdAt, f.cursor));

  return db
    .select({
      id: schema.run.id,
      status: schema.run.status,
      inputType: schema.run.inputType,
      source: schema.run.source,
      resourceCount: schema.run.resourceCount,
      conformanceScoreBefore: schema.run.conformanceScoreBefore,
      conformanceScoreAfter: schema.run.conformanceScoreAfter,
      findingsTotal: schema.run.findingsTotal,
      creditsCharged: schema.run.creditsCharged,
      createdAt: schema.run.createdAt,
      completedAt: schema.run.completedAt,
    })
    .from(schema.run)
    .where(and(...conditions))
    .orderBy(desc(schema.run.createdAt))
    .limit(f.limit);
}

// one run scoped to a workspace, or undefined.
export async function getRun(db: Db, workspaceId: string, runId: string) {
  const [row] = await db
    .select()
    .from(schema.run)
    .where(and(eq(schema.run.id, runId), eq(schema.run.workspaceId, workspaceId)))
    .limit(1);
  return row;
}

// a run's findings, highest rank first.
export function getRunFindings(db: Db, runId: string) {
  return db
    .select()
    .from(schema.finding)
    .where(eq(schema.finding.runId, runId))
    .orderBy(desc(schema.finding.rank));
}
