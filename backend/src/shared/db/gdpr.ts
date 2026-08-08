import { eq } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";

// names artifacts rather than inlining them; blob content can be gigabytes
export async function exportWorkspaceData(db: Db, workspaceId: string) {
  const [settings] = await db
    .select()
    .from(schema.workspaceSettings)
    .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
    .limit(1);

  const runs = await db.select().from(schema.run).where(eq(schema.run.workspaceId, workspaceId));
  const findings = await db
    .select()
    .from(schema.finding)
    .where(eq(schema.finding.workspaceId, workspaceId));
  const mappings = await db
    .select()
    .from(schema.mappingRegistryEntry)
    .where(eq(schema.mappingRegistryEntry.workspaceId, workspaceId));
  const ledger = await db
    .select()
    .from(schema.creditLedgerEntry)
    .where(eq(schema.creditLedgerEntry.workspaceId, workspaceId));
  const invoices = await db
    .select()
    .from(schema.invoice)
    .where(eq(schema.invoice.workspaceId, workspaceId));
  const audit = await db
    .select()
    .from(schema.auditLogEntry)
    .where(eq(schema.auditLogEntry.workspaceId, workspaceId));
  const checks = await db
    .select()
    .from(schema.scheduledCheck)
    .where(eq(schema.scheduledCheck.workspaceId, workspaceId));
  const packets = await db
    .select()
    .from(schema.conformancePacketRun)
    .where(eq(schema.conformancePacketRun.workspaceId, workspaceId));
  // keys and hashes only, so the export stays a manifest
  const artifacts = await db
    .select({
      key: schema.storedObject.key,
      kind: schema.storedObject.kind,
      sizeBytes: schema.storedObject.sizeBytes,
      sha256: schema.storedObject.sha256,
      containsPhi: schema.storedObject.containsPhi,
      createdAt: schema.storedObject.createdAt,
      deletedAt: schema.storedObject.deletedAt,
    })
    .from(schema.storedObject)
    .where(eq(schema.storedObject.workspaceId, workspaceId));

  return {
    exportedAt: new Date().toISOString(),
    workspaceId,
    settings: settings ?? null,
    runs,
    findings,
    mappings,
    ledger,
    invoices,
    audit,
    scheduledChecks: checks,
    conformancePackets: packets,
    artifacts,
  };
}

export type DeletionSummary = {
  runsDeleted: number;
  findingsDeleted: number;
  artifactsPurged: number;
  ledgerRetained: number;
  auditRetained: number;
  evidenceRetained: number;
};

// tombstone id for detached append-only rows; not a real workspace, so nothing reads them
export const CLOSED_WORKSPACE = "workspace_deleted";

// PHI rows are hard deleted; ledger, audit and evidence survive detached for reconciliation
export async function deleteWorkspaceData(
  db: Db,
  workspaceId: string,
): Promise<DeletionSummary> {
  const artifacts = await db
    .select({ key: schema.storedObject.key })
    .from(schema.storedObject)
    .where(eq(schema.storedObject.workspaceId, workspaceId));

  const findings = await db
    .delete(schema.finding)
    .where(eq(schema.finding.workspaceId, workspaceId))
    .returning({ id: schema.finding.id });

  // unlike the retention sweep, a deleted workspace keeps no manifest
  await db.delete(schema.storedObject).where(eq(schema.storedObject.workspaceId, workspaceId));

  const runs = await db
    .delete(schema.run)
    .where(eq(schema.run.workspaceId, workspaceId))
    .returning({ id: schema.run.id });

  // operational config carries endpoints and encrypted secrets: also PHI-adjacent.
  await db.delete(schema.scheduledCheck).where(eq(schema.scheduledCheck.workspaceId, workspaceId));
  await db.delete(schema.driftAlert).where(eq(schema.driftAlert.workspaceId, workspaceId));
  await db.delete(schema.encryptedSecret).where(eq(schema.encryptedSecret.workspaceId, workspaceId));
  await db.delete(schema.apiKey).where(eq(schema.apiKey.workspaceId, workspaceId));
  await db.delete(schema.webhookEndpoint).where(eq(schema.webhookEndpoint.workspaceId, workspaceId));
  await db.delete(schema.apiRequestLog).where(eq(schema.apiRequestLog.workspaceId, workspaceId));
  await db
    .delete(schema.mappingRegistryEntry)
    .where(eq(schema.mappingRegistryEntry.workspaceId, workspaceId));
  await db
    .delete(schema.workspaceSettings)
    .where(eq(schema.workspaceSettings.workspaceId, workspaceId));
  await db.delete(schema.notificationLog).where(eq(schema.notificationLog.workspaceId, workspaceId));

  // append-only survivors: detached and anonymized, never deleted.
  const ledger = await db
    .update(schema.creditLedgerEntry)
    .set({ workspaceId: CLOSED_WORKSPACE })
    .where(eq(schema.creditLedgerEntry.workspaceId, workspaceId))
    .returning({ id: schema.creditLedgerEntry.id });

  const audit = await db
    .update(schema.auditLogEntry)
    .set({ workspaceId: CLOSED_WORKSPACE, actorId: null, ip: null })
    .where(eq(schema.auditLogEntry.workspaceId, workspaceId))
    .returning({ id: schema.auditLogEntry.id });

  const evidence = await db
    .update(schema.evidenceBundle)
    .set({ workspaceId: CLOSED_WORKSPACE })
    .where(eq(schema.evidenceBundle.workspaceId, workspaceId))
    .returning({ id: schema.evidenceBundle.id });

  // the run names a customer endpoint so it goes; the evidence bundle survives
  await db
    .delete(schema.conformancePacketRun)
    .where(eq(schema.conformancePacketRun.workspaceId, workspaceId));
  await db.delete(schema.billingAccount).where(eq(schema.billingAccount.workspaceId, workspaceId));
  await db.delete(schema.invoice).where(eq(schema.invoice.workspaceId, workspaceId));

  return {
    runsDeleted: runs.length,
    findingsDeleted: findings.length,
    artifactsPurged: artifacts.length,
    ledgerRetained: ledger.length,
    auditRetained: audit.length,
    evidenceRetained: evidence.length,
  };
}
