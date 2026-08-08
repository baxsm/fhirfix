import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import type { BlobStore } from "./blob";
import type { Db } from "./client";
import { centsFromMicro, evaluateAutoRecharge, nextAlertThreshold, priceForRun } from "./credits";
import { ensureBillingAccount, postLedgerEntry } from "./ledger";
import { hasNotification, recordNotification } from "./notifications";
import * as schema from "./schema/index";


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

// only api-key runs can be test mode; dashboard and scheduled checks are always live
async function isTestModeRun(db: Db, runId: string): Promise<boolean> {
  const [row] = await db
    .select({ mode: schema.apiKey.mode })
    .from(schema.run)
    .innerJoin(schema.apiKey, eq(schema.apiKey.id, schema.run.actorId))
    .where(and(eq(schema.run.id, runId), eq(schema.run.actorType, "api_key")))
    .limit(1);
  return row?.mode === "test";
}

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
  // blobStore.put created the row with the bytes; merge the metadata onto it.
  await db
    .insert(schema.storedObject)
    .values({
      key: correctedKey,
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

  await writeFindings(db, runId, workspaceId, result);

  // a test key must never spend real credits; the UI sells "live" as the paying mode
  const chargeMicro = (await isTestModeRun(db, runId))
    ? 0
    : priceForRun({ resourceCount: result.resourceCount });

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

  // a free run posts no ledger entry: a zero debit is a row that never moved the balance
  if (chargeMicro === 0) {
    const account = await ensureBillingAccount(db, workspaceId);
    return { chargeMicro: 0, balanceAfter: account?.balanceMicroCredits ?? 0 };
  }

  const { balanceAfter } = await postLedgerEntry(db, {
    workspaceId,
    type: "debit",
    amountMicro: -chargeMicro,
    description: `Run ${runId} (${result.resourceCount} resource${result.resourceCount === 1 ? "" : "s"})`,
    createdBy: "system",
    relatedRunId: runId,
  });

  // must top up before alerting or the warning is already out of date when it sends
  const afterRecharge = await maybeAutoRecharge(db, workspaceId, balanceAfter);
  await maybeSendLowBalanceAlert(db, workspaceId, afterRecharge);

  return { chargeMicro, balanceAfter: afterRecharge };
}

// injected at startup: db/ must not depend on a payment provider
type AutoRechargeHandler = (args: {
  workspaceId: string;
  rechargeCents: number;
}) => Promise<{ credited: boolean; balanceMicro: number }>;

let autoRechargeHandler: AutoRechargeHandler | null = null;

export function setAutoRechargeHandler(handler: AutoRechargeHandler): void {
  autoRechargeHandler = handler;
}

// returns the balance after any top-up, or the balance unchanged.
async function maybeAutoRecharge(
  db: Db,
  workspaceId: string,
  balanceAfter: number,
): Promise<number> {
  if (!autoRechargeHandler) return balanceAfter;

  const account = await ensureBillingAccount(db, workspaceId);
  if (!account) return balanceAfter;

  const spendThisCycleCents = await purchasesThisCycleCents(db, workspaceId);
  const decision = evaluateAutoRecharge({
    balanceMicro: balanceAfter,
    enabled: account.autoRechargeEnabled,
    thresholdMicro: account.autoRechargeThreshold,
    rechargeAmountCents: account.autoRechargeAmountCents,
    spendThisCycleCents,
    monthlySpendCapCents: account.monthlySpendCapCents,
  });
  if (!decision.shouldRecharge) return balanceAfter;

  const result = await autoRechargeHandler({
    workspaceId,
    rechargeCents: decision.rechargeCents,
  });
  return result.credited ? result.balanceMicro : balanceAfter;
}

// calendar month to date, the window the monthly spend cap is measured against
async function purchasesThisCycleCents(db: Db, workspaceId: string): Promise<number> {
  const now = new Date();
  const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rows = await db
    .select({ amountMicro: schema.creditLedgerEntry.amountMicroCredits })
    .from(schema.creditLedgerEntry)
    .where(
      and(
        eq(schema.creditLedgerEntry.workspaceId, workspaceId),
        eq(schema.creditLedgerEntry.type, "purchase"),
        gte(schema.creditLedgerEntry.createdAt, cycleStart),
      ),
    );
  return rows.reduce((sum, r) => sum + centsFromMicro(r.amountMicro), 0);
}

// injected at startup; unset is recorded as a send failure, never a silent success
type LowBalanceSender = (args: {
  to: string;
  threshold: number;
  balanceMicro: number;
}) => Promise<void>;

let sendLowBalanceEmail: LowBalanceSender | null = null;

export function setLowBalanceSender(sender: LowBalanceSender): void {
  sendLowBalanceEmail = sender;
}

// the credits.low webhook, dispatched alongside the email
type LowBalanceWebhook = (args: {
  workspaceId: string;
  threshold: number;
  balanceMicro: number;
}) => Promise<void>;

let dispatchLowBalance: LowBalanceWebhook | null = null;

export function setLowBalanceWebhook(dispatch: LowBalanceWebhook): void {
  dispatchLowBalance = dispatch;
}

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

  const contact = await resolveBillingEmail(db, workspaceId, account.contactUserId);
  const target = contact?.email ?? null;

  // must consume the threshold even when opted out, or it re-fires at the same level
  if (contact && !contact.wantsAlert) {
    if (dispatchLowBalance) {
      await dispatchLowBalance({ workspaceId, threshold, balanceMicro: balanceAfter }).catch(
        () => {},
      );
    }
    await db
      .update(schema.billingAccount)
      .set({ lastAlertThreshold: threshold })
      .where(eq(schema.billingAccount.workspaceId, workspaceId));
    return;
  }

  // no contact to reach: record the miss honestly rather than logging a delivery.
  if (!target) {
    await recordNotification(db, {
      workspaceId,
      channel: "email",
      type: "credits.low",
      target: "unknown",
      status: "failed",
      metadata: { dedup, threshold, balanceAfter, baselineMicro, reason: "no billing contact" },
    });
    return;
  }

  // must send before recording, or the log claims deliveries that never happened
  let status: "sent" | "failed" = "sent";
  let failure: string | undefined;
  try {
    if (!sendLowBalanceEmail) throw new Error("no email transport configured");
    await sendLowBalanceEmail({ to: target, threshold, balanceMicro: balanceAfter });
  } catch (error) {
    status = "failed";
    failure = error instanceof Error ? error.message : String(error);
  }

  await recordNotification(db, {
    workspaceId,
    channel: "email",
    type: "credits.low",
    target,
    status,
    metadata: { dedup, threshold, balanceAfter, baselineMicro, ...(failure ? { failure } : {}) },
  });

  // a separate channel: a failed email must not suppress the webhook
  if (dispatchLowBalance) {
    await dispatchLowBalance({ workspaceId, threshold, balanceMicro: balanceAfter }).catch(
      () => {},
    );
  }

  // only on a real send, so a transient failure cannot permanently silence this level
  if (status === "sent") {
    await db
      .update(schema.billingAccount)
      .set({ lastAlertThreshold: threshold })
      .where(eq(schema.billingAccount.workspaceId, workspaceId));
  }
}

// unparseable prefs mean "default on", so a bad blob never silences a real alert
function wantsLowBalance(raw: unknown): boolean {
  if (typeof raw !== "string" || raw.length === 0) return true;
  try {
    const parsed = JSON.parse(raw) as { lowBalance?: unknown };
    return parsed.lowBalance !== false;
  } catch {
    return true;
  }
}

async function resolveBillingEmail(
  db: Db,
  workspaceId: string,
  contactUserId: string | null,
): Promise<{ email: string; wantsAlert: boolean } | null> {
  if (contactUserId) {
    const [u] = await db
      .select({ email: schema.user.email, prefs: schema.user.notificationPrefs })
      .from(schema.user)
      .where(eq(schema.user.id, contactUserId))
      .limit(1);
    if (u?.email) return { email: u.email, wantsAlert: wantsLowBalance(u.prefs) };
  }
  const [owner] = await db
    .select({ email: schema.user.email, prefs: schema.user.notificationPrefs })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(and(eq(schema.member.organizationId, workspaceId), eq(schema.member.role, "owner")))
    .limit(1);
  return owner?.email ? { email: owner.email, wantsAlert: wantsLowBalance(owner.prefs) } : null;
}


export interface RunListFilter {
  workspaceId: string;
  status?: string;
  inputType?: string;
  from?: Date;
  to?: Date;
  cursor?: Date;
  limit: number;
}

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
