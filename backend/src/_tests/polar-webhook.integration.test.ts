import { afterAll, describe, expect, test } from "bun:test";
import { reconcileBalance } from "@shared/db/ledger";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  handleOrderPaid,
  handleOrderRefunded,
  handleSubscription,
  polarWebhookRoutes,
} from "@/routes/polar-webhook";

const ws = `polar_test_${Date.now()}`;
const subWs = `polar_sub_${Date.now()}`;

async function tierOf(workspaceId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ planTier: schema.workspaceSettings.planTier })
    .from(schema.workspaceSettings)
    .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  return row?.planTier;
}

afterAll(async () => {
  await db.delete(schema.creditLedgerEntry).where(eq(schema.creditLedgerEntry.workspaceId, ws));
  await db.delete(schema.invoice).where(eq(schema.invoice.workspaceId, ws));
  await db.delete(schema.billingAccount).where(eq(schema.billingAccount.workspaceId, ws));
  await db.delete(schema.workspaceSettings).where(eq(schema.workspaceSettings.workspaceId, subWs));
  await db.delete(schema.auditLogEntry).where(eq(schema.auditLogEntry.workspaceId, subWs));
});

const order = (id: string, creditsMicro: number, amountCents: number) => ({
  polarOrderId: id,
  workspaceId: ws,
  creditsMicro,
  amountCents,
  customerId: "cust_test",
});

describe("Polar order handling", () => {
  test("order.paid credits the ledger and writes a paid invoice", async () => {
    await handleOrderPaid(order("ord_1", 25_000_000, 2500));

    expect(await reconcileBalance(db, ws)).toBe(25_000_000);
    const invoices = await db
      .select()
      .from(schema.invoice)
      .where(eq(schema.invoice.workspaceId, ws));
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.status).toBe("paid");
    expect(invoices[0]?.amountCents).toBe(2500);
    // customer id recorded for future checkouts.
    const [acct] = await db
      .select({ polarCustomerId: schema.billingAccount.polarCustomerId })
      .from(schema.billingAccount)
      .where(eq(schema.billingAccount.workspaceId, ws))
      .limit(1);
    expect(acct?.polarCustomerId).toBe("cust_test");
  });

  test("a redelivered order.paid is idempotent (no double credit)", async () => {
    await handleOrderPaid(order("ord_1", 25_000_000, 2500));
    expect(await reconcileBalance(db, ws)).toBe(25_000_000); // unchanged
    const invoices = await db
      .select()
      .from(schema.invoice)
      .where(eq(schema.invoice.workspaceId, ws));
    expect(invoices).toHaveLength(1);
  });

  test("a refund reverses the credits and voids the invoice", async () => {
    await handleOrderRefunded(order("ord_1", 25_000_000, 2500));
    expect(await reconcileBalance(db, ws)).toBe(0);
    const [inv] = await db
      .select()
      .from(schema.invoice)
      .where(eq(schema.invoice.polarOrderId, "ord_1"))
      .limit(1);
    expect(inv?.status).toBe("void");
  });

  test("a redelivered refund is idempotent (no double reversal)", async () => {
    await handleOrderRefunded(order("ord_1", 25_000_000, 2500));
    expect(await reconcileBalance(db, ws)).toBe(0); // still zero, not negative
  });
});

describe("Polar subscription handling", () => {
  test("an active subscription grants premium, and losing it drops back to free", async () => {
    await db.insert(schema.workspaceSettings).values({
      id: `wss_sub_${Date.now()}`,
      workspaceId: subWs,
    });

    await handleSubscription({ workspaceId: subWs, active: true });
    expect(await tierOf(subWs)).toBe("premium");

    await handleSubscription({ workspaceId: subWs, active: false });
    expect(await tierOf(subWs)).toBe("free");
  });

  test("a subscription for an unknown workspace changes nothing", async () => {
    await handleSubscription({ workspaceId: "ws_does_not_exist", active: true });
    const rows = await db
      .select()
      .from(schema.workspaceSettings)
      .where(eq(schema.workspaceSettings.workspaceId, "ws_does_not_exist"));
    expect(rows).toHaveLength(0);
  });

  test("granting premium twice is idempotent", async () => {
    await handleSubscription({ workspaceId: subWs, active: true });
    await handleSubscription({ workspaceId: subWs, active: true });
    expect(await tierOf(subWs)).toBe("premium");
  });
});

describe("Polar webhook route", () => {
  test("a bad signature is rejected with 403 and credits nothing", async () => {
    const raw = JSON.stringify({ type: "order.paid", data: { id: "ord_evil" } });
    const req = new Request("http://localhost/api/polar/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": "msg_evil",
        "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
        "webhook-signature": "v1,Zm9yZ2VkIHNpZ25hdHVyZQ==",
      },
      body: raw,
    });
    const res = await polarWebhookRoutes.fetch(req);
    expect(res.status).toBe(403);
    const evil = await db
      .select()
      .from(schema.invoice)
      .where(eq(schema.invoice.polarOrderId, "ord_evil"));
    expect(evil).toHaveLength(0);
  });
});
