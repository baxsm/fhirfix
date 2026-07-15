import { afterAll, describe, expect, test } from "bun:test";
import { grantTrialCredits, reconcileBalance } from "@fhirfix/db/ledger";
import { type CompletedRunResult, persistCompletedRun } from "@fhirfix/db/runs";
import { eq, inArray } from "drizzle-orm";
import { blobKey, blobStore } from "@/lib/blob";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";

// integration: the shared run-completion path (db/runs.ts) against real Postgres +
// the real blob store. proves the extraction from the worker persists the corrected
// artifact, findings, the completed run row, and debits credits atomically - the
// exact behavior the worker had, now shared with the sync REST path.

const workspaces: string[] = [];
const runIds: string[] = [];

function fakeResult(resourceCount: number, findingCount: number): CompletedRunResult {
  return {
    inputType: "fhir_json",
    fhirVersion: "R4",
    profilesApplied: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
    resourceCount,
    conformanceScoreBefore: 880,
    conformanceScoreAfter: 970,
    autoFixApplied: true,
    findingsTotal: findingCount,
    findingsAutoFixable: findingCount,
    correctedResource: { resourceType: "Patient", id: "x" },
    findings: Array.from({ length: findingCount }, (_, i) => ({
      severity: "warning" as const,
      category: "profile",
      ruleSource: "us-core",
      specCitation: "US Core 6.1.0",
      resourceType: "Patient",
      fhirpath: `Patient.identifier[${i}]`,
      rawValidatorMessage: "raw",
      plainMessage: "plain",
      suggestedFix: "fix",
      fixConfidence: "auto" as const,
      fixStatus: "applied" as const,
      dedupFingerprint: `fp-${i}`,
      occurrenceCount: 1,
      rank: i,
    })),
  };
}

async function seedRun(fund: boolean): Promise<{ workspaceId: string; runId: string }> {
  const workspaceId = `persist_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  workspaces.push(workspaceId);
  if (fund) await grantTrialCredits(db, workspaceId, "system");
  const runId = createId("run");
  runIds.push(runId);
  await db.insert(schema.run).values({
    id: runId,
    workspaceId,
    actorType: "user",
    actorId: "system",
    source: "ui",
    inputType: "fhir_json",
    engineVersion: "test",
    status: "running",
  });
  return { workspaceId, runId };
}

afterAll(async () => {
  if (runIds.length) {
    await db.delete(schema.finding).where(inArray(schema.finding.runId, runIds));
    await db.delete(schema.run).where(inArray(schema.run.id, runIds));
  }
  if (workspaces.length) {
    await db
      .delete(schema.storedObject)
      .where(inArray(schema.storedObject.workspaceId, workspaces));
    await db
      .delete(schema.creditLedgerEntry)
      .where(inArray(schema.creditLedgerEntry.workspaceId, workspaces));
    await db
      .delete(schema.billingAccount)
      .where(inArray(schema.billingAccount.workspaceId, workspaces));
  }
});

describe("persistCompletedRun", () => {
  test("writes corrected artifact, findings, completes the run, debits credits", async () => {
    const { workspaceId, runId } = await seedRun(true);
    const before = await reconcileBalance(db, workspaceId);

    const key = blobKey(workspaceId, runId, "corrected");
    const { chargeMicro, balanceAfter } = await persistCompletedRun(db, blobStore, {
      workspaceId,
      runId,
      result: fakeResult(3, 2),
      correctedKey: key,
    });

    // run row completed with the right scores + charge.
    const [row] = await db.select().from(schema.run).where(eq(schema.run.id, runId)).limit(1);
    expect(row?.status).toBe("completed");
    expect(row?.resourceCount).toBe(3);
    expect(row?.conformanceScoreAfter).toBe(970);
    expect(row?.correctedRef).toBe(key);
    expect(row?.creditsCharged).toBe(chargeMicro);

    // findings persisted.
    const findings = await db.select().from(schema.finding).where(eq(schema.finding.runId, runId));
    expect(findings.length).toBe(2);

    // corrected artifact stored + tracked.
    const corrected = await blobStore.get(key);
    expect(JSON.parse(corrected).resourceType).toBe("Patient");
    const [obj] = await db
      .select()
      .from(schema.storedObject)
      .where(eq(schema.storedObject.key, key))
      .limit(1);
    expect(obj?.kind).toBe("corrected");

    // credits debited: 3 resources * $0.01 = 30000 micro.
    expect(chargeMicro).toBe(30_000);
    expect(balanceAfter).toBe(before - chargeMicro);
    // cache == ledger sum, no drift.
    expect(balanceAfter).toBe(await reconcileBalance(db, workspaceId));
  });

  test("a completed run with zero findings still completes and charges", async () => {
    const { workspaceId, runId } = await seedRun(true);
    const key = blobKey(workspaceId, runId, "corrected");
    const { chargeMicro } = await persistCompletedRun(db, blobStore, {
      workspaceId,
      runId,
      result: fakeResult(1, 0),
      correctedKey: key,
    });
    const [row] = await db.select().from(schema.run).where(eq(schema.run.id, runId)).limit(1);
    expect(row?.status).toBe("completed");
    expect(row?.findingsTotal).toBe(0);
    expect(chargeMicro).toBe(10_000); // 1 resource floored
  });
});
