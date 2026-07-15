import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// workspace settings extend the Better Auth organization row 1:1.
// an organization IS a workspace in this product.
export const workspaceSettings = pgTable("workspace_settings", {
  id: text("id").primaryKey(), // wss_...
  workspaceId: text("workspace_id").notNull().unique(), // -> organization.id
  defaultProfiles: jsonb("default_profiles")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  defaultTerminologyServer: text("default_terminology_server"), // null = in-process + VSAC
  redactionPolicy: text("redaction_policy", {
    enum: ["off", "on_ingest", "required"],
  })
    .notNull()
    .default("on_ingest"),
  dataRetentionDays: integer("data_retention_days").notNull().default(30),
  baaStatus: text("baa_status", { enum: ["none", "requested", "signed"] })
    .notNull()
    .default("none"),
  planTier: text("plan_tier", { enum: ["free", "team", "premium"] })
    .notNull()
    .default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type NewWorkspaceSettings = typeof workspaceSettings.$inferInsert;
