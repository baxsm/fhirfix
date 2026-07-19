import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// the moat. authority->system and code->code mappings that feed the auto-fix
// engine at run time. versioned via supersede chains, never edited in place,
// because one mapping change can silently rewrite thousands of downstream records.
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
    // rejected is a tombstone: it keeps the auto-learn loop from re-suggesting a
    // source value a human already turned down.
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
    // one live row per (workspace, type, source value, scope target). superseded
    // rows are excluded so the whole history of a mapping can coexist. this is what
    // makes the auto-learn insert safe under concurrent runs: without it, two runs
    // that both pass the existence check both insert a duplicate suggestion.
    //
    // source_system is coalesced because it is null on every workspace-scoped row,
    // and postgres treats nulls as distinct in a unique index - which would exempt
    // exactly the rows the auto-learn loop writes.
    oneLive: uniqueIndex("mapping_live_unique_idx")
      .on(t.workspaceId, t.type, t.sourceValue, t.scope, sql`coalesce(${t.sourceSystem}, '')`)
      .where(sql`${t.supersededById} is null`),
  }),
);

export type MappingRegistryEntry = typeof mappingRegistryEntry.$inferSelect;
export type NewMappingRegistryEntry = typeof mappingRegistryEntry.$inferInsert;
