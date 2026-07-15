import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// auditable record of every transactional send (low-balance alert, drift alert,
// report ready, invite, packet complete). also the dedup source: a threshold
// alert is only sent if a matching row for this cycle does not already exist.
export const notificationLog = pgTable("notification_log", {
  id: text("id").primaryKey(), // ntf_...
  workspaceId: text("workspace_id").notNull(),
  channel: text("channel", { enum: ["email", "slack", "webhook"] }).notNull(),
  type: text("type").notNull(), // credits.low, drift.alert, report.ready, member.invite, conformance.complete
  target: text("target").notNull(), // recipient address / url
  status: text("status", { enum: ["sent", "failed", "bounced"] }).notNull(),
  providerMessageId: text("provider_message_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type NotificationLog = typeof notificationLog.$inferSelect;
export type NewNotificationLog = typeof notificationLog.$inferInsert;
