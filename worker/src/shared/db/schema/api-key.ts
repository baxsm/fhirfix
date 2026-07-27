import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(), // key_...
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(), // shown masked, e.g. "ffx_live_ab12"
    hashedKey: text("hashed_key").notNull(), // HMAC-SHA256 of full key; keyed, indexed lookup
    mode: text("mode", { enum: ["test", "live"] }).notNull(),
    scopes: jsonb("scopes")
      .$type<string[]>()
      .notNull()
      .default(sql`'["validate","convert","fix"]'::jsonb`),
    createdBy: text("created_by").notNull(), // user.id
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    byWorkspace: index("api_key_workspace_idx").on(t.workspaceId),
    byHash: index("api_key_hash_idx").on(t.hashedKey),
  }),
);

export type ApiKey = typeof apiKey.$inferSelect;
export type NewApiKey = typeof apiKey.$inferInsert;
