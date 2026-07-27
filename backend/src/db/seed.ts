import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";

const STARTER_MAPPINGS: Array<{
  type: "authority_to_system" | "code_to_code";
  sourceValue: string;
  targetValue: string;
  targetSystem: string | null;
}> = [
  // the v2-to-fhir converter's SIMULATOR MRN authority -> a real resolvable system.
  {
    type: "authority_to_system",
    sourceValue: "SIMULATOR-MRN",
    targetValue: "http://northwind-health.org/fhir/sid/mrn",
    targetSystem: null,
  },
  {
    type: "authority_to_system",
    sourceValue: "SIMULATOR MRN",
    targetValue: "http://northwind-health.org/fhir/sid/mrn",
    targetSystem: null,
  },
  // HL7 Table 0001 administrative gender codes -> FHIR AdministrativeGender.
  { type: "code_to_code", sourceValue: "M", targetValue: "male", targetSystem: null },
  { type: "code_to_code", sourceValue: "F", targetValue: "female", targetSystem: null },
  { type: "code_to_code", sourceValue: "O", targetValue: "other", targetSystem: null },
  { type: "code_to_code", sourceValue: "U", targetValue: "unknown", targetSystem: null },
];

async function seedWorkspace(workspaceId: string): Promise<number> {
  let inserted = 0;
  for (const m of STARTER_MAPPINGS) {
    const existing = await db
      .select({ id: schema.mappingRegistryEntry.id })
      .from(schema.mappingRegistryEntry)
      .where(
        and(
          eq(schema.mappingRegistryEntry.workspaceId, workspaceId),
          eq(schema.mappingRegistryEntry.type, m.type),
          eq(schema.mappingRegistryEntry.sourceValue, m.sourceValue),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;
    await db.insert(schema.mappingRegistryEntry).values({
      id: createId("mapping"),
      workspaceId,
      type: m.type,
      sourceValue: m.sourceValue,
      targetValue: m.targetValue,
      targetSystem: m.targetSystem,
      status: "active",
      createdBy: "system",
    });
    inserted += 1;
  }
  return inserted;
}

async function seed() {
  const workspaces = await db.select({ id: schema.organization.id }).from(schema.organization);
  let total = 0;
  for (const ws of workspaces) {
    total += await seedWorkspace(ws.id);
  }
  logger.info("db.seed", `seeded ${total} starter mappings across ${workspaces.length} workspaces`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error("db.seed", err);
    process.exit(1);
  });
