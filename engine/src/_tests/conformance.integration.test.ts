import { describe, expect, it } from "vitest";
import { buildCoverageMatrix, summarizeMatrix, TEST_KITS } from "../conformance";
import { InfernoClient, type InfernoTestResult } from "../inferno-client";

const INFERNO_URL = process.env.INFERNO_URL ?? "http://localhost:4568";
const TARGET = process.env.CONFORMANCE_TARGET ?? "https://hapi.fhir.org/baseR4";
const client = new InfernoClient({ baseUrl: INFERNO_URL });

const planNet = TEST_KITS.find((k) => k.id === "plan_net");
if (!planNet) throw new Error("plan_net kit missing from the registry");

const reachable = await client.ready().catch(() => false);
const suite = reachable ? describe : describe.skip;

suite("inferno plan-net against a live fhir server", () => {
  it("reports a real inferno version", async () => {
    const version = await client.version();
    expect(version).toMatch(/^\d+\.\d+/);
  });

  it("exposes the suite id the registry pins", async () => {
    const loaded = await client.suite(planNet.suiteId);
    expect(loaded.id).toBe(planNet.suiteId);
    expect(loaded.version).toBe(planNet.kitVersion.replace(/^v/, ""));
  });

  it("declares the ig identifier the registry pins", async () => {
    const loaded = await client.suite(planNet.suiteId);
    const identifiers = (loaded.requirement_sets ?? []).map((set) => set.identifier);
    expect(identifiers).toContain(planNet.igIdentifier);
  });

  it("returns requirements carrying real conformance verbs", async () => {
    const requirements = await client.requirements(planNet.suiteId);
    expect(requirements.length).toBeGreaterThan(0);
    expect(requirements.every((r) => r.id.startsWith(planNet.igIdentifier))).toBe(true);
    expect(requirements.some((r) => r.conformance.startsWith("SHALL"))).toBe(true);
  });

  it(
    "runs a real test group and normalizes the results into a matrix",
    async () => {
      const sessionId = await client.createSession(planNet.suiteId);
      const started = await client.startRun(sessionId, planNet.suiteId, [
        { name: "url", value: TARGET },
        { name: "no_param_search", value: "true" },
        { name: "max_instances", value: "2" },
        { name: "max_pages", value: "1" },
      ]);
      expect(started.id).toBeTruthy();

      const deadline = Date.now() + 8 * 60 * 1000;
      let results: InfernoTestResult[] = [];
      let status = started.status ?? "running";
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 4000));
        const run = await client.getRun(started.id);
        status = run.status ?? status;
        results = run.results ?? results;
        if (status === "done" || status === "cancelled") break;
      }

      if (status !== "done") {
        await client.cancelRun(started.id).catch(() => {});
      }
      expect(results.length).toBeGreaterThan(0);

      const [loaded, requirements] = await Promise.all([
        client.suite(planNet.suiteId),
        client.requirements(planNet.suiteId),
      ]);
      const cells = buildCoverageMatrix(planNet, loaded, requirements, results);
      expect(cells.length).toBe(requirements.length);

      const summary = summarizeMatrix(cells);
      expect(summary.total).toBe(cells.length);
      expect(summary.pass + summary.fail + summary.skip + summary.other).toBe(summary.total);
      // a real server exercises at least one requirement rather than skipping all
      expect(summary.pass + summary.fail).toBeGreaterThan(0);
    },
    10 * 60 * 1000,
  );

  it("answers 409 when a session is given a second concurrent run", async () => {
    const inputs = [
      { name: "url", value: TARGET },
      { name: "no_param_search", value: "true" },
      { name: "max_instances", value: "2" },
      { name: "max_pages", value: "1" },
    ];
    const sessionId = await client.createSession(planNet.suiteId);
    const first = await client.startRun(sessionId, planNet.suiteId, inputs);
    let status: number | undefined;
    try {
      await client.startRun(sessionId, planNet.suiteId, inputs);
    } catch (err) {
      status = (err as { upstreamStatus?: number }).upstreamStatus;
    }
    await client.cancelRun(first.id).catch(() => {});
    expect(status).toBe(409);
  });
});
