import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const webhookEndpoint = pgTable(
  "webhook_endpoint",
  {
    id: text("id").primaryKey(), // whk_...
    workspaceId: text("workspace_id").notNull(),
    url: text("url").notNull(),
    events: jsonb("events").$type<string[]>().notNull(),
    secret: text("secret").notNull(), // encrypted at rest (iv:tag:ciphertext)
    enabled: boolean("enabled").notNull().default(true),
    lastDeliveryStatus: text("last_delivery_status"),
    lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index("webhook_endpoint_workspace_idx").on(t.workspaceId),
  }),
);

export type WebhookEndpoint = typeof webhookEndpoint.$inferSelect;
export type NewWebhookEndpoint = typeof webhookEndpoint.$inferInsert;
