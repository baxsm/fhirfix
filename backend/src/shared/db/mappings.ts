import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";


export type MappingType = "authority_to_system" | "code_to_code" | "facility_to_org" | "custom";
export type MappingStatus = "active" | "suggested" | "deprecated" | "rejected";
export type MappingScope = "workspace" | "source_system";

export interface RegistryMapping {
  type: MappingType;
  sourceValue: string;
  targetValue: string;
  targetSystem: string | null;
  status: "active";
}

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
