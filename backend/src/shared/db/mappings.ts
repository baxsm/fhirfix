import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";

// the mapping registry: shared read + write path for the engine and the api.
// lives here rather than in the worker because three callers (worker run, worker
// apply, sync REST) all load the same rows, and they used to hold three
// byte-identical copies of the query.

export type MappingType = "authority_to_system" | "code_to_code" | "facility_to_org" | "custom";
export type MappingStatus = "active" | "suggested" | "deprecated" | "rejected";
export type MappingScope = "workspace" | "source_system";

// what the engine consumes. narrower than the row in two ways: no audit columns,
// and status is pinned to "active" because loadActiveMappings only ever returns
// active rows. the engine's own lookup used to re-check status defensively; the
// type now carries that guarantee instead.
export interface RegistryMapping {
  type: MappingType;
  sourceValue: string;
  targetValue: string;
  targetSystem: string | null;
  status: "active";
}

// load the active mappings that apply to one run. a source_system-scoped row only
// applies when the run names that same source system, so an integration-specific
// mapping cannot leak onto every other feed in the workspace. passing no
// sourceSystem gets workspace-scoped rows only.
//
// ordered so the caller's first match is the most specific: source_system rows
// before workspace rows, then newest version first. the engine's lookup takes the
// first match, so this ordering is what makes "most specific wins" true rather
// than leaving it to postgres row order.
export async function loadActiveMappings(
  db: Db,
  workspaceId: string,
  sourceSystem?: string | null,
): Promise<RegistryMapping[]> {
  const scopeFilter = sourceSystem
    ? or(
        eq(schema.mappingRegistryEntry.scope, "workspace"),
        and(
          eq(schema.mappingRegistryEntry.scope, "source_system"),
          eq(schema.mappingRegistryEntry.sourceSystem, sourceSystem),
        ),
      )
    : eq(schema.mappingRegistryEntry.scope, "workspace");

  return db
    .select({
      type: schema.mappingRegistryEntry.type,
      sourceValue: schema.mappingRegistryEntry.sourceValue,
      targetValue: schema.mappingRegistryEntry.targetValue,
      targetSystem: schema.mappingRegistryEntry.targetSystem,
      // the where clause below pins this to active, so select the literal rather
      // than the column and let the type say what the query already guarantees.
      status: sql<"active">`'active'`,
    })
    .from(schema.mappingRegistryEntry)
    .where(
      and(
        eq(schema.mappingRegistryEntry.workspaceId, workspaceId),
        eq(schema.mappingRegistryEntry.status, "active"),
        // a superseded row is history, never an input to a run.
        isNull(schema.mappingRegistryEntry.supersededById),
        scopeFilter,
      ),
    )
    .orderBy(
      // specific before general. spelled out rather than relying on the enum
      // values sorting that way by accident.
      sql`case ${schema.mappingRegistryEntry.scope} when 'source_system' then 0 else 1 end`,
      desc(schema.mappingRegistryEntry.version),
    );
}

export interface SuggestionInput {
  type: MappingType;
  sourceValue: string;
  targetValue: string;
  targetSystem: string | null;
  confidence: number;
}

// persist auto-learned suggestions. skips any source value the workspace already
// has an opinion about in any status, so an approved mapping is not re-suggested
// and a rejected one is not resurrected on the next run.
//
// the insert relies on the partial unique index on
// (workspace_id, type, source_value) for live rows: two concurrent runs that both
// pass the existence check would otherwise both insert. onConflictDoNothing makes
// the loser a no-op instead of a duplicate.
export async function persistSuggestions(
  db: Db,
  workspaceId: string,
  suggestions: SuggestionInput[],
  newId: () => string,
): Promise<number> {
  if (suggestions.length === 0) return 0;

  const sourceValues = suggestions.map((s) => s.sourceValue);
  const existing = await db
    .select({
      type: schema.mappingRegistryEntry.type,
      sourceValue: schema.mappingRegistryEntry.sourceValue,
    })
    .from(schema.mappingRegistryEntry)
    .where(
      and(
        eq(schema.mappingRegistryEntry.workspaceId, workspaceId),
        inArray(schema.mappingRegistryEntry.sourceValue, sourceValues),
        isNull(schema.mappingRegistryEntry.supersededById),
      ),
    );

  const known = new Set(existing.map((e) => `${e.type}|${e.sourceValue}`));
  const fresh = suggestions.filter((s) => !known.has(`${s.type}|${s.sourceValue}`));
  if (fresh.length === 0) return 0;

  const rows = await db
    .insert(schema.mappingRegistryEntry)
    .values(
      fresh.map((s) => ({
        id: newId(),
        workspaceId,
        type: s.type,
        sourceValue: s.sourceValue,
        targetValue: s.targetValue,
        targetSystem: s.targetSystem,
        status: "suggested" as const,
        confidence: s.confidence,
        createdBy: "system",
      })),
    )
    .onConflictDoNothing()
    .returning({ id: schema.mappingRegistryEntry.id });

  return rows.length;
}
