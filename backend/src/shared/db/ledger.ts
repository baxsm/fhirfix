import { customAlphabet } from "nanoid";
import type { Db } from "./client";
import { PRICING } from "./credits";
import * as schema from "./schema/index";
import { eq } from "drizzle-orm";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);
const ledgerId = () => `led_${nano()}`;
const billingId = () => `bil_${nano()}`;

export type LedgerType = "purchase" | "debit" | "grant" | "refund" | "expiry" | "adjustment";

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

// the only place the balance may be mutated: locks the billing_account row for the tx
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

export async function reconcileBalance(db: Db, workspaceId: string): Promise<number> {
  const rows = await db
    .select({ amount: schema.creditLedgerEntry.amountMicroCredits })
    .from(schema.creditLedgerEntry)
    .where(eq(schema.creditLedgerEntry.workspaceId, workspaceId));
  return rows.reduce((sum, r) => sum + r.amount, 0);
}
