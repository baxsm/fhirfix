import { afterAll, describe, expect, test } from "bun:test";
import { PRICING, priceForRun } from "@shared/db/credits";
import { grantTrialCredits, postLedgerEntry, reconcileBalance } from "@shared/db/ledger";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// integration: the credit ledger + balance cache against real Postgres. proves the
// append-only ledger reconciles to the cache and that the FOR UPDATE lock keeps
// concurrent debits from drifting the cache (the phase-4 concurrency requirement).

const workspaces: string[] = [];
function newWorkspace(): string {
  const ws = `led_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  workspaces.push(ws);
  return ws;
}

afterAll(async () => {
  if (workspaces.length === 0) return;
  await db
    .delete(schema.creditLedgerEntry)
    .where(inArray(schema.creditLedgerEntry.workspaceId, workspaces));
  await db
    .delete(schema.billingAccount)
    .where(inArray(schema.billingAccount.workspaceId, workspaces));
});

describe("credit ledger", () => {
  test("trial grant seeds $5 and reconciles", async () => {
    const ws = newWorkspace();
    const { balanceAfter } = await grantTrialCredits(db, ws, "system");
    expect(balanceAfter).toBe(PRICING.trialGrantMicro);
    expect(await reconcileBalance(db, ws)).toBe(PRICING.trialGrantMicro);
  });

  test("a debit lowers the balance and cache == sum(ledger)", async () => {
    const ws = newWorkspace();
    await grantTrialCredits(db, ws, "system");
    const cost = priceForRun({ resourceCount: 3 });
    const { balanceAfter } = await postLedgerEntry(db, {
      workspaceId: ws,
      type: "debit",
      amountMicro: -cost,
      description: "test run",
      createdBy: "system",
    });
    expect(balanceAfter).toBe(PRICING.trialGrantMicro - cost);
    // cache row matches the ledger sum.
    const [acct] = await db
      .select({ balance: schema.billingAccount.balanceMicroCredits })
      .from(schema.billingAccount)
      .where(eq(schema.billingAccount.workspaceId, ws))
      .limit(1);
    expect(acct?.balance).toBe(await reconcileBalance(db, ws));
  });

  test("concurrency: 25 simultaneous debits do not drift the cache", async () => {
    const ws = newWorkspace();
    await grantTrialCredits(db, ws, "system");
    const unit = priceForRun({ resourceCount: 1 });

    // fire all debits at once. without the FOR UPDATE lock, read-modify-write races
    // would leave the cache higher than the true ledger sum.
    await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        postLedgerEntry(db, {
          workspaceId: ws,
          type: "debit",
          amountMicro: -unit,
          description: `concurrent ${i}`,
          createdBy: "system",
        }),
      ),
    );

    const [acct] = await db
      .select({ balance: schema.billingAccount.balanceMicroCredits })
      .from(schema.billingAccount)
      .where(eq(schema.billingAccount.workspaceId, ws))
      .limit(1);
    const truth = await reconcileBalance(db, ws);

    expect(acct?.balance).toBe(truth); // no drift
    expect(acct?.balance).toBe(PRICING.trialGrantMicro - 25 * unit);
  });

  test("a top-up resets the low-balance alert cursor", async () => {
    const ws = newWorkspace();
    await grantTrialCredits(db, ws, "system");
    // simulate a prior alert.
    await db
      .update(schema.billingAccount)
      .set({ lastAlertThreshold: 75 })
      .where(eq(schema.billingAccount.workspaceId, ws));

    await postLedgerEntry(db, {
      workspaceId: ws,
      type: "purchase",
      amountMicro: 10 * 1_000_000,
      description: "top up",
      createdBy: "system",
      resetAlertThreshold: true,
    });

    const [acct] = await db
      .select({ last: schema.billingAccount.lastAlertThreshold })
      .from(schema.billingAccount)
      .where(eq(schema.billingAccount.workspaceId, ws))
      .limit(1);
    expect(acct?.last).toBe(0);
  });
});
