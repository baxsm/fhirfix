import { afterAll, describe, expect, test } from "bun:test";
import { CLOSED_WORKSPACE, deleteWorkspaceData, exportWorkspaceData } from "@shared/db/gdpr";
import { eq } from "drizzle-orm";
import { writeAudit } from "@/lib/audit";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";

const ws = `gdpr_test_${Date.now()}`;

afterAll(async () => {
  // tombstone rows are append-only by design, so they are removed by id
  await db.delete(schema.creditLedgerEntry).where(eq(schema.creditLedgerEntry.workspaceId, ws));
  await db.delete(schema.auditLogEntry).where(eq(schema.auditLogEntry.workspaceId, ws));
});

async function seed() {
  await db
    .insert(schema.workspaceSettings)
    .values({ id: createId("workspaceSettings"), workspaceId: ws });
  const runId = createId("run");
  await db.insert(schema.run).values({
    id: runId,
    workspaceId: ws,
    actorType: "user",
    actorId: "u_gdpr",
    source: "ui",
    inputType: "fhir_json",
    engineVersion: "test",
    status: "completed",
  });
  await db.insert(schema.finding).values({
    id: createId("finding"),
    runId,
    workspaceId: ws,
    severity: "error",
    category: "structural",
    ruleSource: "test",
    specCitation: "test",
    rawValidatorMessage: "raw test message",
    plainMessage: "test finding",
    suggestedFix: "test fix",
    fixConfidence: "manual",
    dedupFingerprint: `fp_${Date.now()}`,
    rank: 1,
  });
  await db.insert(schema.storedObject).values({
    key: `${ws}/input.json`,
    workspaceId: ws,
    bucket: "db",
    kind: "input",
    sizeBytes: 10,
    contentType: "application/json",
    sha256: "abc",
    content: "PHI-PAYLOAD",
    uploadState: "stored",
  });
  await db.insert(schema.creditLedgerEntry).values({
    id: createId("ledger"),
    workspaceId: ws,
    type: "grant",
    amountMicroCredits: 1000,
    balanceAfter: 1000,
    description: "test grant",
    createdBy: "system",
  });
  await writeAudit({
    workspaceId: ws,
    action: "run.created",
    actorType: "user",
    actorId: "u_gdpr",
    ip: "203.0.113.9",
    targetRef: runId,
  });
  return runId;
}

describe("workspace data export", () => {
  test("returns the workspace's own records", async () => {
    await seed();
    const archive = await exportWorkspaceData(db, ws);
    expect(archive.workspaceId).toBe(ws);
    expect(archive.runs.length).toBe(1);
    expect(archive.findings.length).toBe(1);
    expect(archive.ledger.length).toBe(1);
    expect(archive.audit.length).toBeGreaterThanOrEqual(1);
    // artifacts are a manifest, not a blob dump.
    expect(archive.artifacts.length).toBe(1);
    expect(archive.artifacts[0]).not.toHaveProperty("content");
  });
});

describe("workspace deletion", () => {
  test("removes PHI but keeps the ledger and audit trail, anonymized", async () => {
    const summary = await deleteWorkspaceData(db, ws);

    expect(summary.runsDeleted).toBe(1);
    expect(summary.findingsDeleted).toBe(1);
    expect(summary.artifactsPurged).toBe(1);
    expect(summary.ledgerRetained).toBe(1);
    expect(summary.auditRetained).toBeGreaterThanOrEqual(1);

    // PHI is gone.
    const runs = await db.select().from(schema.run).where(eq(schema.run.workspaceId, ws));
    const findings = await db
      .select()
      .from(schema.finding)
      .where(eq(schema.finding.workspaceId, ws));
    const blobs = await db
      .select()
      .from(schema.storedObject)
      .where(eq(schema.storedObject.workspaceId, ws));
    expect(runs).toHaveLength(0);
    expect(findings).toHaveLength(0);
    expect(blobs).toHaveLength(0);

    // settings and api surface go too.
    const settings = await db
      .select()
      .from(schema.workspaceSettings)
      .where(eq(schema.workspaceSettings.workspaceId, ws));
    expect(settings).toHaveLength(0);

    // the financial and compliance record survives, detached from the workspace.
    const ledgerAtWs = await db
      .select()
      .from(schema.creditLedgerEntry)
      .where(eq(schema.creditLedgerEntry.workspaceId, ws));
    expect(ledgerAtWs).toHaveLength(0);

    const tombstoned = await db
      .select()
      .from(schema.creditLedgerEntry)
      .where(eq(schema.creditLedgerEntry.workspaceId, CLOSED_WORKSPACE));
    expect(tombstoned.length).toBeGreaterThanOrEqual(1);
  });

  test("the surviving audit rows carry no actor or ip", async () => {
    const rows = await db
      .select({ actorId: schema.auditLogEntry.actorId, ip: schema.auditLogEntry.ip })
      .from(schema.auditLogEntry)
      .where(eq(schema.auditLogEntry.workspaceId, CLOSED_WORKSPACE));
    // every detached row is stripped: no identifying actor, no ip.
    for (const r of rows) {
      expect(r.actorId).toBeNull();
      expect(r.ip).toBeNull();
    }
  });
});
