import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// one billing account per workspace. balance_micro_credits is a derived CACHE of
// sum(credit_ledger_entry.amount); it is only ever written inside the same
// transaction as a ledger insert, behind a SELECT ... FOR UPDATE on this row, so
// two concurrent completing runs cannot drift it. money is cents, credits are
// micro-credits (1 credit = 1_000_000 micro = $1), always shown to users in dollars.
export const billingAccount = pgTable("billing_account", {
  id: text("id").primaryKey(), // bil_...
  workspaceId: text("workspace_id").notNull().unique(),
  polarCustomerId: text("polar_customer_id"),
  balanceMicroCredits: integer("balance_micro_credits").notNull().default(0),
  autoRechargeEnabled: boolean("auto_recharge_enabled").notNull().default(false),
  autoRechargeThreshold: integer("auto_recharge_threshold"), // micro-credits, fire below this
  autoRechargeAmountCents: integer("auto_recharge_amount_cents"), // top-up size
  monthlySpendCapCents: integer("monthly_spend_cap_cents"),
  billingContactUserId: text("billing_contact_user_id"),
  // highest low-balance alert threshold already sent this cycle (0/50/75/100),
  // reset to 0 on a top-up, so alerts do not re-fire on every run.
  lastAlertThreshold: integer("last_alert_threshold").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// APPEND-ONLY. no updates, no deletes. balance = sum(amount_micro_credits).
// amount is negative for debit/expiry, positive for purchase/grant/refund.
export const creditLedgerEntry = pgTable(
  "credit_ledger_entry",
  {
    id: text("id").primaryKey(), // led_...
    workspaceId: text("workspace_id").notNull(),
    type: text("type", {
      enum: ["purchase", "debit", "grant", "refund", "expiry", "adjustment"],
    }).notNull(),
    amountMicroCredits: integer("amount_micro_credits").notNull(),
    balanceAfter: integer("balance_after").notNull(), // running balance snapshot at write time
    relatedRunId: text("related_run_id"),
    relatedInvoiceId: text("related_invoice_id"),
    description: text("description").notNull(),
    createdBy: text("created_by").notNull(), // user id or "system"
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index("ledger_workspace_idx").on(t.workspaceId, t.createdAt),
  }),
);

// a purchase record backing a Polar order. one row per completed order, keyed to
// polar_order_id for webhook idempotency (a redelivered order.paid is a no-op).
export const invoice = pgTable("invoice", {
  id: text("id").primaryKey(), // inv_...
  workspaceId: text("workspace_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  creditsPurchasedMicro: integer("credits_purchased_micro").notNull(),
  status: text("status", { enum: ["draft", "open", "paid", "void"] }).notNull(),
  polarOrderId: text("polar_order_id"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export type BillingAccount = typeof billingAccount.$inferSelect;
export type NewBillingAccount = typeof billingAccount.$inferInsert;
export type CreditLedgerEntry = typeof creditLedgerEntry.$inferSelect;
export type NewCreditLedgerEntry = typeof creditLedgerEntry.$inferInsert;
export type Invoice = typeof invoice.$inferSelect;
export type NewInvoice = typeof invoice.$inferInsert;
