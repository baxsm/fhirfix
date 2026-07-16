// REAL http against a running backend. no mocks, no fixtures - this is the layer
// that catches what unit tests cannot (wrong paths, wrong body keys, auth chain
// changes, error-envelope drift).
//
// requires: a running backend + the sidecars, and a real test key.
//   FHIRFIX_API_KEY=ffx_test_... FHIRFIX_BASE_URL=http://localhost:3001/api/v1 bun test
// skips itself (rather than failing) when those are absent, so `bun test` stays
// green on a machine with no stack up.

import { beforeAll, describe, expect, test } from "bun:test";
import {
  AuthenticationError,
  ConflictError,
  Fhirfix,
  PermissionDeniedError,
  UnprocessableError,
} from "../index.js";

const BASE_URL = process.env.FHIRFIX_BASE_URL ?? "http://localhost:3001/api/v1";
const API_KEY = process.env.FHIRFIX_API_KEY;

// a Patient with a real conformance defect: gender "M" is not a valid
// administrative-gender code (the value set requires male/female/other/unknown).
const BAD_PATIENT = JSON.stringify({
  resourceType: "Patient",
  id: "example",
  gender: "M",
  name: [{ family: "Doe", given: ["Jane"] }],
});

const HL7V2 = [
  "MSH|^~\\&|SENDING_APP|SENDING_FAC|RECV_APP|RECV_FAC|20240101120000||ADT^A01|MSG00001|P|2.5",
  "PID|1||12345^^^MRN||Doe^Jane||19850315|F",
].join("\r");

let live = false;

beforeAll(async () => {
  if (!API_KEY) return;
  try {
    const res = await fetch(`${BASE_URL}/openapi.json`, {
      signal: AbortSignal.timeout(3000),
    });
    live = res.ok;
  } catch {
    live = false;
  }
  if (!live) {
    console.warn(`skipping integration tests: no API at ${BASE_URL}`);
  }
});

const client = () => new Fhirfix({ apiKey: API_KEY ?? "unused", baseUrl: BASE_URL });

// bun's test.skipIf evaluates at collection time, before beforeAll runs, so guard
// inside each test instead.
function requireLive(): boolean {
  if (!API_KEY || !live) return false;
  return true;
}

describe("integration: auth", () => {
  test("ping returns the key's workspace, mode and scopes", async () => {
    if (!requireLive()) return;
    const result = await client().ping();
    expect(result.ok).toBe(true);
    expect(result.mode).toBe("test");
    expect(result.workspaceId).toBeTruthy();
    expect(result.scopes).toContain("fix");
  });

  test("an invalid key raises AuthenticationError, not a generic failure", async () => {
    if (!requireLive()) return;
    const bad = new Fhirfix({ apiKey: "ffx_test_definitelynotreal", baseUrl: BASE_URL });
    // the specific subclass is the contract: callers branch on it.
    expect(bad.ping()).rejects.toBeInstanceOf(AuthenticationError);
  });

  test("a malformed key is rejected before any db work", async () => {
    if (!requireLive()) return;
    const bad = new Fhirfix({ apiKey: "not-even-a-ffx-key", baseUrl: BASE_URL });
    try {
      await bad.ping();
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthenticationError);
      expect((err as AuthenticationError).code).toBe("unauthorized");
    }
  });
});

describe("integration: validate", () => {
  test("finds the invalid gender code on a real Patient", async () => {
    if (!requireLive()) return;
    const result = await client().validate({ input: BAD_PATIENT });
    expect(result.runId).toStartWith("run_");
    expect(result.status).toBe("completed");
    expect(result.inputType).toBe("fhir_json");
    expect(result.findingsTotal).toBeGreaterThan(0);
    // the score is 0-1000 and a defective resource must not be perfect.
    expect(result.conformanceScoreBefore).toBeLessThan(1000);
    const finding = result.findings[0];
    expect(finding).toBeDefined();
    expect(finding?.plainMessage).toBeTruthy();
    expect(["error", "warning", "info"]).toContain(finding?.severity ?? "");
  }, 60_000);

  test("garbage input is a 422, not a 500", async () => {
    if (!requireLive()) return;
    expect(client().validate({ input: "this is not fhir at all" })).rejects.toBeInstanceOf(
      UnprocessableError,
    );
  }, 30_000);
});

describe("integration: fix", () => {
  test("returns a corrected artifact and lifts the score", async () => {
    if (!requireLive()) return;
    const result = await client().fix({ input: BAD_PATIENT });
    expect(result.runId).toStartWith("run_");
    expect(result.corrected).toBeTruthy();
    // the corrected artifact must be parseable json and still a Patient.
    const corrected = JSON.parse(result.corrected) as { resourceType: string; gender?: string };
    expect(corrected.resourceType).toBe("Patient");
    // the whole product promise: after >= before.
    expect(result.conformanceScoreAfter).toBeGreaterThanOrEqual(result.conformanceScoreBefore);
  }, 60_000);

  test("redact strips PHI from the corrected output", async () => {
    if (!requireLive()) return;
    const result = await client().fix({ input: BAD_PATIENT, redact: true });
    // "Doe" is the family name in the input; redaction must remove it.
    expect(result.corrected).not.toContain("Doe");
  }, 60_000);
});

describe("integration: convert", () => {
  test("turns an HL7v2 ADT into FHIR", async () => {
    if (!requireLive()) return;
    const result = await client().convert({ input: HL7V2 });
    expect(result.inputType).toBe("hl7v2");
    expect(result.fhir).toBeTruthy();
    const fhir = JSON.parse(result.fhir) as { resourceType?: string };
    // the converter emits a Bundle for a message.
    expect(fhir.resourceType).toBeTruthy();
  }, 90_000);
});

describe("integration: idempotency", () => {
  test("the same key + same body replays the prior run instead of re-running", async () => {
    if (!requireLive()) return;
    const key = `sdk-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const first = await client().validate({ input: BAD_PATIENT, idempotencyKey: key });
    const second = await client().validate({ input: BAD_PATIENT, idempotencyKey: key });
    // same run id = the engine did not run twice and the caller was not charged twice.
    expect(second.runId).toBe(first.runId);
  }, 90_000);

  test("the same key + a different body is a 409 conflict", async () => {
    if (!requireLive()) return;
    const key = `sdk-conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await client().validate({ input: BAD_PATIENT, idempotencyKey: key });
    const other = JSON.stringify({ resourceType: "Patient", id: "other", gender: "F" });
    try {
      await client().validate({ input: other, idempotencyKey: key });
      throw new Error("should have thrown a conflict");
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      expect((err as ConflictError).code).toBe("idempotency_conflict");
    }
  }, 90_000);
});

describe("integration: runs", () => {
  test("lists runs newest-first and pages with a cursor", async () => {
    if (!requireLive()) return;
    const page = await client().runs.list({ limit: 2 });
    expect(Array.isArray(page.runs)).toBe(true);
    expect(page.runs.length).toBeLessThanOrEqual(2);
    if (page.hasMore) expect(page.nextCursor).toBeTruthy();
  }, 30_000);

  test("fetches a run and its findings by id", async () => {
    if (!requireLive()) return;
    const created = await client().validate({ input: BAD_PATIENT });
    const detail = await client().runs.get(created.runId);
    expect(detail.run.id).toBe(created.runId);
    expect(detail.run.status).toBe("completed");
    expect(detail.findings.length).toBe(created.findings.length);
  }, 60_000);

  test("downloads the corrected artifact for a fixed run", async () => {
    if (!requireLive()) return;
    const fixed = await client().fix({ input: BAD_PATIENT });
    const artifact = await client().runs.corrected(fixed.runId);
    expect(artifact).toBeTruthy();
    expect(() => JSON.parse(artifact)).not.toThrow();
  }, 90_000);

  test("returns the report as json and as a FHIR OperationOutcome", async () => {
    if (!requireLive()) return;
    const created = await client().validate({ input: BAD_PATIENT });
    const json = await client().runs.report(created.runId, "json");
    expect(() => JSON.parse(json)).not.toThrow();

    const oo = await client().runs.report(created.runId, "operationoutcome");
    const parsed = JSON.parse(oo) as { resourceType?: string };
    expect(parsed.resourceType).toBe("OperationOutcome");
  }, 60_000);

  test("a missing run id is a NotFoundError", async () => {
    if (!requireLive()) return;
    const { NotFoundError } = await import("../index.js");
    expect(client().runs.get("run_doesnotexist000000")).rejects.toBeInstanceOf(NotFoundError);
  }, 30_000);
});

describe("integration: scopes", () => {
  test("a key without a scope gets PermissionDeniedError", async () => {
    if (!requireLive() || !process.env.FHIRFIX_NOSCOPE_KEY) return;
    const limited = new Fhirfix({ apiKey: process.env.FHIRFIX_NOSCOPE_KEY, baseUrl: BASE_URL });
    expect(limited.fix({ input: BAD_PATIENT })).rejects.toBeInstanceOf(PermissionDeniedError);
  }, 30_000);
});
