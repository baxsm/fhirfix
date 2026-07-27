import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
  lastAlertThreshold: integer("last_alert_threshold").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
