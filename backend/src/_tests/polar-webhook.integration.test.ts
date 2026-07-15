import { afterAll, describe, expect, test } from "bun:test";
import { reconcileBalance } from "@shared/db/ledger";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { handleOrderPaid, handleOrderRefunded, polarWebhookRoutes } from "@/routes/polar-webhook";

// integration against real Postgres. the order.paid/refunded business logic
// (invoice + ledger + idempotency) is exercised directly with a parsed order,
// because Polar's validateEvent requires a full, schema-complete SDK Order that
// only the live sandbox produces. the signature-verification -> 403 path IS tested
// end to end through the route with a deliberately bad signature. the live
// checkout -> real webhook leg is verified separately once sandbox creds are set.

const ws = `polar_test_${Date.now()}`;

afterAll(async () => {
  await db.delete(schema.creditLedgerEntry).where(eq(schema.creditLedgerEntry.workspaceId, ws));
  await db.delete(schema.invoice).where(eq(schema.invoice.workspaceId, ws));
  await db.delete(schema.billingAccount).where(eq(schema.billingAccount.workspaceId, ws));
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
