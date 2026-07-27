import { postLedgerEntry } from "@shared/db/ledger";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { type ParsedOrder, parseWebhook, WebhookVerificationError } from "@/lib/polar";

export const polarWebhookRoutes = new Hono();

polarWebhookRoutes.post("/api/polar/webhook", async (c) => {
  // must stay raw and unparsed: the signature is computed over the exact bytes
  const rawBody = await c.req.text();
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let parsed: ReturnType<typeof parseWebhook>;
  try {
    parsed = parseWebhook(rawBody, headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      logger.warn("polar.webhook", "signature verification failed");
      return c.json({ error: "invalid signature" }, 403);
    }
    logger.error("polar.webhook", err);
    return c.json({ error: "webhook error" }, 400);
  }

  if (parsed.kind === "ignored" || !parsed.order) {
    return c.json({ ok: true, handled: false }, 202);
  }

  try {
    if (parsed.kind === "order.paid") {
      await handleOrderPaid(parsed.order);
    } else if (parsed.kind === "order.refunded") {
      await handleOrderRefunded(parsed.order);
    }
  } catch (err) {
    logger.error("polar.webhook", err);
    // 500 so Polar retries; the handler is idempotent so a retry is safe.
    return c.json({ error: "processing failed" }, 500);
  }

  return c.json({ ok: true, handled: true }, 202);
});

export async function handleOrderPaid(order: ParsedOrder): Promise<void> {
  const existing = await db
    .select({ id: schema.invoice.id })
    .from(schema.invoice)
    .where(eq(schema.invoice.polarOrderId, order.polarOrderId))
    .limit(1);
  if (existing.length > 0) {
    logger.info("polar.webhook", `order ${order.polarOrderId} already processed`);
    return;
  }

  const invoiceId = createId("invoice");
  await db.insert(schema.invoice).values({
    id: invoiceId,
    workspaceId: order.workspaceId,
    amountCents: order.amountCents,
    creditsPurchasedMicro: order.creditsMicro,
    status: "paid",
    polarOrderId: order.polarOrderId,
    paidAt: new Date(),
  });

  await postLedgerEntry(db, {
    workspaceId: order.workspaceId,
    type: "purchase",
    amountMicro: order.creditsMicro,
    description: `Credit purchase (${order.polarOrderId})`,
    createdBy: "system",
    relatedInvoiceId: invoiceId,
    resetAlertThreshold: true,
  });

  // record the polar customer id so future checkouts reuse the same customer.
  if (order.customerId) {
    await db
      .update(schema.billingAccount)
      .set({ polarCustomerId: order.customerId })
      .where(eq(schema.billingAccount.workspaceId, order.workspaceId));
  }

  logger.info(
    "polar.webhook",
    `credited ${order.creditsMicro} micro to ${order.workspaceId} (order ${order.polarOrderId})`,
  );
}

export async function handleOrderRefunded(order: ParsedOrder): Promise<void> {
  const existing = await db
    .select({ id: schema.creditLedgerEntry.id })
    .from(schema.creditLedgerEntry)
    .where(
      and(
        eq(schema.creditLedgerEntry.workspaceId, order.workspaceId),
        eq(schema.creditLedgerEntry.type, "refund"),
        eq(schema.creditLedgerEntry.description, `Refund (${order.polarOrderId})`),
      ),
    )
    .limit(1);
  if (existing.length > 0) return;

  await db
    .update(schema.invoice)
    .set({ status: "void" })
    .where(eq(schema.invoice.polarOrderId, order.polarOrderId));

  await postLedgerEntry(db, {
    workspaceId: order.workspaceId,
    type: "refund",
    amountMicro: -order.creditsMicro,
    description: `Refund (${order.polarOrderId})`,
    createdBy: "system",
  });

  logger.info(
    "polar.webhook",
    `refunded ${order.creditsMicro} micro on order ${order.polarOrderId}`,
  );
}
