import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const mappingRegistryEntry = pgTable(
  "mapping_registry_entry",
  {
    id: text("id").primaryKey(), // map_...
    workspaceId: text("workspace_id").notNull(),
    scope: text("scope", { enum: ["workspace", "source_system"] })
      .notNull()
      .default("workspace"),
    sourceSystem: text("source_system"), // null when scope=workspace
    type: text("type", {
      enum: ["authority_to_system", "code_to_code", "facility_to_org", "custom"],
    }).notNull(),
    sourceValue: text("source_value").notNull(),
    targetValue: text("target_value").notNull(),
    targetSystem: text("target_system"),
    status: text("status", { enum: ["active", "suggested", "deprecated", "rejected"] })
      .notNull()
      .default("suggested"),
    confidence: integer("confidence"), // 0-100 for auto-learned suggestions
    version: integer("version").notNull().default(1),
    supersedesId: text("supersedes_id"),
    supersededById: text("superseded_by_id"),
    createdBy: text("created_by").notNull(), // user.id or "system" for auto-learned
    approvedBy: text("approved_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byLookup: index("mapping_lookup_idx").on(
      t.workspaceId,
      t.type,
      t.sourceValue,
      t.status,
    ),
    oneLive: uniqueIndex("mapping_live_unique_idx")
      .on(t.workspaceId, t.type, t.sourceValue, t.scope, sql`coalesce(${t.sourceSystem}, '')`)
      .where(sql`${t.supersededById} is null`),
  }),
);

export type MappingRegistryEntry = typeof mappingRegistryEntry.$inferSelect;
export type NewMappingRegistryEntry = typeof mappingRegistryEntry.$inferInsert;
