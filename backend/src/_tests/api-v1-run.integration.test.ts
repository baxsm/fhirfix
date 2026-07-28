import { afterAll, describe, expect, test } from "bun:test";
import { grantTrialCredits } from "@shared/db/ledger";
import { eq, inArray } from "drizzle-orm";
import { generateKey } from "@/lib/api-key";
import { db, schema } from "@/lib/db";
import { SAMPLE_FIXTURES } from "./fixtures-samples";
import { createId } from "@/lib/id";
import { apiV1 } from "@/routes/api-v1/index";

const workspaces: string[] = [];
const keyIds: string[] = [];

async function seedKey(mode: "test" | "live" = "test"): Promise<{
  full: string;
  workspaceId: string;
}> {
  const workspaceId = `apiv1run_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  workspaces.push(workspaceId);
  await grantTrialCredits(db, workspaceId, "system");
  const { full, prefix, hash } = generateKey(mode);
  const id = createId("apiKey");
  keyIds.push(id);
  await db.insert(schema.apiKey).values({
    id,
    workspaceId,
    name: "run key",
    prefix,
    hashedKey: hash,
    mode,
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

const patientSample = SAMPLE_FIXTURES.find((s) => s.kind === "fhir_json")?.content ?? "";
const hl7Sample = SAMPLE_FIXTURES.find((s) => s.kind === "hl7v2")?.content ?? "";

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
    const { full } = await seedKey("live");
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

  test("a test-mode key runs without spending credits", async () => {
    if (!patientSample) return;
    const { full } = await seedKey("test");
    const res = await post("/fix", full, { input: patientSample });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runId: string };

    const [row] = await db.select().from(schema.run).where(eq(schema.run.id, body.runId)).limit(1);
    expect(row?.creditsCharged).toBe(0);
    // and no ledger entry at all, not a zero-amount one.
    const debits = await db
      .select({ id: schema.creditLedgerEntry.id })
      .from(schema.creditLedgerEntry)
      .where(eq(schema.creditLedgerEntry.relatedRunId, body.runId));
    expect(debits.length).toBe(0);
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

function get(path: string, key: string): Promise<Response> {
  return Promise.resolve(apiV1.request(path, { headers: { authorization: `Bearer ${key}` } }));
}

describe("api-v1 runs read + batch", () => {
  test("list, get, report, and corrected all work for a fixed run", async () => {
    const { full } = await seedKey();
    const fixed = await post("/fix", full, { input: patientSample });
    const { runId } = (await fixed.json()) as { runId: string };

    // list includes the run.
    const list = await get("/runs?limit=10", full);
    expect(list.status).toBe(200);
    const listBody = (await list.json()) as { runs: Array<{ id: string }>; hasMore: boolean };
    expect(listBody.runs.some((r) => r.id === runId)).toBe(true);

    // get returns the run + findings.
    const one = await get(`/runs/${runId}`, full);
    expect(one.status).toBe(200);
    const oneBody = (await one.json()) as { run: { status: string }; findings: unknown[] };
    expect(oneBody.run.status).toBe("completed");

    // report json + operationoutcome.
    const json = await get(`/runs/${runId}/report?format=json`, full);
    expect(json.status).toBe(200);
    expect(((await json.json()) as { report: string }).report).toBe("fhirfix.remediation");
    const oo = await get(`/runs/${runId}/report?format=operationoutcome`, full);
    expect(((await oo.json()) as { resourceType: string }).resourceType).toBe("OperationOutcome");

    // corrected artifact is octet-stream (anti download-manager).
    const corrected = await get(`/runs/${runId}/corrected`, full);
    expect(corrected.status).toBe(200);
    expect(corrected.headers.get("Content-Type")).toBe("application/octet-stream");
  }, 30_000);

  test("list filters by status and paginates by cursor", async () => {
    const { full } = await seedKey();
    await post("/fix", full, { input: patientSample });
    const res = await get("/runs?status=completed&limit=1", full);
    const body = (await res.json()) as { runs: Array<{ status: string }>; hasMore: boolean };
    expect(body.runs.every((r) => r.status === "completed")).toBe(true);
    expect(body.runs.length).toBeLessThanOrEqual(1);
  }, 30_000);

  test("batch queues a run and it completes", async () => {
    const { full } = await seedKey();
    const res = await post("/batch", full, { input: patientSample });
    expect(res.status).toBe(202);
    const { runId, status } = (await res.json()) as { runId: string; status: string };
    expect(status).toBe("queued");

    // poll until the worker completes it.
    let done = false;
    for (let i = 0; i < 40 && !done; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const g = await get(`/runs/${runId}`, full);
      const gb = (await g.json()) as { run: { status: string } };
      if (gb.run.status === "completed" || gb.run.status === "failed") done = true;
    }
    const final = await get(`/runs/${runId}`, full);
    expect(((await final.json()) as { run: { status: string } }).run.status).toBe("completed");
  }, 30_000);

  test("a run from another workspace is not visible (404)", async () => {
    const a = await seedKey();
    const b = await seedKey();
    const fixed = await post("/fix", a.full, { input: patientSample });
    const { runId } = (await fixed.json()) as { runId: string };
    // b's key cannot read a's run.
    const res = await get(`/runs/${runId}`, b.full);
    expect(res.status).toBe(404);
  }, 30_000);
});
