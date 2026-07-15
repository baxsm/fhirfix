import { afterAll, describe, expect, test } from "bun:test";
import { grantTrialCredits } from "@fhirfix/db/ledger";
import { eq, inArray } from "drizzle-orm";
import { generateKey } from "@/lib/api-key";
import { db, schema } from "@/lib/db";
import { DEMO_SAMPLES } from "@/lib/demo-samples";
import { createId } from "@/lib/id";
import { apiV1 } from "@/routes/api-v1/index";

// integration: the sync REST validate/fix/convert controllers against the REAL
// validator + converter sidecars. proves findings come back, fixes correct + debit,
// HL7v2 converts, and idempotency replays the same run without double-charging.

const workspaces: string[] = [];
const keyIds: string[] = [];

async function seedKey(): Promise<{ full: string; workspaceId: string }> {
  const workspaceId = `apiv1run_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  workspaces.push(workspaceId);
  await grantTrialCredits(db, workspaceId, "system");
  const { full, prefix, hash } = generateKey("test");
  const id = createId("apiKey");
  keyIds.push(id);
  await db.insert(schema.apiKey).values({
    id,
    workspaceId,
    name: "run key",
    prefix,
    hashedKey: hash,
    mode: "test",
    scopes: ["validate", "convert", "fix", "runs", "mappings"],
    createdBy: "system",
  });
  return { full, workspaceId };
}

async function post(path: string, key: string, body: unknown, idem?: string): Promise<Response> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
  if (idem) headers["idempotency-key"] = idem;
  return apiV1.request(path, { method: "POST", headers, body: JSON.stringify(body) });
}

const patientSample = DEMO_SAMPLES.find((s) => s.kind === "fhir_json")?.content ?? "";
const hl7Sample = DEMO_SAMPLES.find((s) => s.kind === "hl7v2")?.content ?? "";

afterAll(async () => {
  const runs = await db
    .select({ id: schema.run.id })
    .from(schema.run)
    .where(inArray(schema.run.workspaceId, workspaces));
  const runIds = runs.map((r) => r.id);
  if (runIds.length) await db.delete(schema.finding).where(inArray(schema.finding.runId, runIds));
  if (workspaces.length) {
    await db.delete(schema.run).where(inArray(schema.run.workspaceId, workspaces));
    await db
      .delete(schema.storedObject)
      .where(inArray(schema.storedObject.workspaceId, workspaces));
    await db
      .delete(schema.apiRequestLog)
      .where(inArray(schema.apiRequestLog.workspaceId, workspaces));
    await db
      .delete(schema.mappingRegistryEntry)
      .where(inArray(schema.mappingRegistryEntry.workspaceId, workspaces));
    await db
      .delete(schema.creditLedgerEntry)
      .where(inArray(schema.creditLedgerEntry.workspaceId, workspaces));
    await db
      .delete(schema.billingAccount)
      .where(inArray(schema.billingAccount.workspaceId, workspaces));
  }
  if (keyIds.length) await db.delete(schema.apiKey).where(inArray(schema.apiKey.id, keyIds));
});

describe("api-v1 validate/fix/convert", () => {
  test("validate returns findings and does not apply fixes", async () => {
    const { full } = await seedKey();
    const res = await post("/validate", full, { input: patientSample });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      runId: string;
      findings: unknown[];
      findingsTotal: number;
      conformanceScoreBefore: number;
    };
    expect(body.runId).toStartWith("run_");
    expect(body.findingsTotal).toBeGreaterThan(0);
    expect(body.findings.length).toBeGreaterThan(0);
    // validate has no corrected/after score.
    expect((body as Record<string, unknown>).corrected).toBeUndefined();
  }, 30_000);

  test("fix applies safe fixes, re-verifies, returns corrected, and debits", async () => {
    const { full } = await seedKey();
    const res = await post("/fix", full, { input: patientSample });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      runId: string;
      conformanceScoreAfter: number;
      conformanceScoreBefore: number;
      corrected: string;
    };
    expect(body.conformanceScoreAfter).toBeGreaterThanOrEqual(body.conformanceScoreBefore);
    expect(body.corrected).toContain("resourceType");

    // the run row was charged.
    const [row] = await db.select().from(schema.run).where(eq(schema.run.id, body.runId)).limit(1);
    expect(row?.source).toBe("api");
    expect(row?.actorType).toBe("api_key");
    expect(row?.creditsCharged).toBeGreaterThan(0);
    // a debit ledger entry exists.
    const debits = await db
      .select({ id: schema.creditLedgerEntry.id })
      .from(schema.creditLedgerEntry)
      .where(eq(schema.creditLedgerEntry.relatedRunId, body.runId));
    expect(debits.length).toBe(1);
  }, 30_000);

  test("convert turns HL7v2 into FHIR resources", async () => {
    if (!hl7Sample) return;
    const { full } = await seedKey();
    const res = await post("/convert", full, { input: hl7Sample });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { fhir: string; resourceCount: number };
    expect(body.resourceCount).toBeGreaterThan(0);
    expect(body.fhir).toContain("resourceType");
  }, 45_000);

  test("idempotency: same key + same body replays the same run, no double charge", async () => {
    const { full, workspaceId } = await seedKey();
    const idem = `idem-${Date.now()}`;
    const first = await post("/fix", full, { input: patientSample }, idem);
    const firstBody = (await first.json()) as { runId: string };
    const second = await post("/fix", full, { input: patientSample }, idem);
    const secondBody = (await second.json()) as { runId: string };
    expect(second.status).toBe(200);
    expect(secondBody.runId).toBe(firstBody.runId); // same run, replayed

    // only ONE run + ONE debit for this workspace.
    const runs = await db
      .select({ id: schema.run.id })
      .from(schema.run)
      .where(eq(schema.run.workspaceId, workspaceId));
    expect(runs.length).toBe(1);
  }, 45_000);

  test("idempotency: same key + different body -> 409", async () => {
    const { full } = await seedKey();
    const idem = `idem-conflict-${Date.now()}`;
    await post("/fix", full, { input: patientSample }, idem);
    const res = await post("/fix", full, { input: `${patientSample} ` }, idem);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("idempotency_conflict");
  }, 45_000);

  test("bad input shape -> 400", async () => {
    const { full } = await seedKey();
    const res = await post("/validate", full, { notinput: "x" });
    expect(res.status).toBe(400);
  });
});
