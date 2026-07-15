import { customAlphabet } from "nanoid";
import type { Db } from "./client";
import { PRICING } from "./credits";
import * as schema from "./schema/index";
import { eq } from "drizzle-orm";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);
const ledgerId = () => `led_${nano()}`;
const billingId = () => `bil_${nano()}`;

export type LedgerType = "purchase" | "debit" | "grant" | "refund" | "expiry" | "adjustment";

// make sure a workspace has a billing account row. idempotent: safe to call on
// every billing read. returns the account.
export async function ensureBillingAccount(db: Db, workspaceId: string) {
  const [existing] = await db
    .select()
    .from(schema.billingAccount)
    .where(eq(schema.billingAccount.workspaceId, workspaceId))
    .limit(1);
  if (existing) return existing;

  // onConflictDoNothing guards the race where two reads create it at once.
  await db
    .insert(schema.billingAccount)
    .values({ id: billingId(), workspaceId })
    .onConflictDoNothing({ target: schema.billingAccount.workspaceId });

  const [created] = await db
    .select()
    .from(schema.billingAccount)
    .where(eq(schema.billingAccount.workspaceId, workspaceId))
    .limit(1);
  return created;
}

// post one append-only ledger entry AND update the balance cache atomically. this
// is the single choke point for balance mutation: a SELECT ... FOR UPDATE locks
// the billing_account row for the duration of the transaction, so two runs
// completing at the same instant serialize here and cannot drift the cache from
// sum(ledger). amountMicro is signed (negative for debit/expiry).
export async function postLedgerEntry(
  db: Db,
  args: {
    workspaceId: string;
    type: LedgerType;
    amountMicro: number;
    description: string;
    createdBy: string; // user id or "system"
    relatedRunId?: string;
    relatedInvoiceId?: string;
    // on a top-up, reset the low-balance alert cursor so alerts can fire again.
    resetAlertThreshold?: boolean;
  },
): Promise<{ balanceAfter: number; entryId: string }> {
  return db.transaction(async (tx) => {
    // ensure the row exists first, then lock it. we do this outside the lock read
    // because the insert path is only hit once per workspace lifetime.
    await tx
      .insert(schema.billingAccount)
      .values({ id: billingId(), workspaceId: args.workspaceId })
      .onConflictDoNothing({ target: schema.billingAccount.workspaceId });

    const [locked] = await tx
      .select({ balance: schema.billingAccount.balanceMicroCredits })
      .from(schema.billingAccount)
      .where(eq(schema.billingAccount.workspaceId, args.workspaceId))
      .for("update")
      .limit(1);

    const current = locked?.balance ?? 0;
    const balanceAfter = current + args.amountMicro;

    const entryId = ledgerId();
    await tx.insert(schema.creditLedgerEntry).values({
      id: entryId,
      workspaceId: args.workspaceId,
      type: args.type,
      amountMicroCredits: args.amountMicro,
      balanceAfter,
      relatedRunId: args.relatedRunId ?? null,
      relatedInvoiceId: args.relatedInvoiceId ?? null,
      description: args.description,
      createdBy: args.createdBy,
    });

    await tx
      .update(schema.billingAccount)
      .set({
        balanceMicroCredits: balanceAfter,
        ...(args.resetAlertThreshold ? { lastAlertThreshold: 0 } : {}),
      })
      .where(eq(schema.billingAccount.workspaceId, args.workspaceId));

    return { balanceAfter, entryId };
  });
}

// seed a new workspace with trial credits. called once from workspace.create.
export async function grantTrialCredits(db: Db, workspaceId: string, createdBy: string) {
  return postLedgerEntry(db, {
    workspaceId,
    type: "grant",
    amountMicro: PRICING.trialGrantMicro,
    description: "Trial credits",
    createdBy,
    resetAlertThreshold: true,
  });
}

// re-derive the true balance from the append-only ledger. used by a reconciliation
// check and by tests asserting the cache never drifts.
export async function reconcileBalance(db: Db, workspaceId: string): Promise<number> {
  const rows = await db
    .select({ amount: schema.creditLedgerEntry.amountMicroCredits })
    .from(schema.creditLedgerEntry)
    .where(eq(schema.creditLedgerEntry.workspaceId, workspaceId));
  return rows.reduce((sum, r) => sum + r.amount, 0);
}
