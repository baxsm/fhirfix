import { describe, expect, it } from "vitest";
import { buildCoverageMatrix, summarizeMatrix, TEST_KITS } from "../conformance";
import { InfernoClient, requiredSuiteInputs, type InfernoTestResult } from "../inferno-client";

const INFERNO_URL = process.env.INFERNO_URL ?? "http://localhost:4568";
const TARGET = process.env.CONFORMANCE_TARGET ?? "https://hapi.fhir.org/baseR4";
const client = new InfernoClient({ baseUrl: INFERNO_URL });

const planNet = TEST_KITS.find((k) => k.id === "plan_net");
if (!planNet) throw new Error("plan_net kit missing from the registry");

const reachable = await client.ready().catch(() => false);
const suite = reachable ? describe : describe.skip;

// inferno signs with its private key, so this only works if the gateway verifies
async function mintToken(gateway: string): Promise<string> {
  const signed = await fetch(`${gateway}/sign-assertion`).catch(() => null);
  if (!signed?.ok) throw new Error("auth gateway cannot sign a test assertion");
  const { assertion } = (await signed.json()) as { assertion: string };

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "system/*.read",
    client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: assertion,
  });
  const res = await fetch(`${gateway}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  const token = (await res.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("token response had no access_token");
  return token.access_token;
}

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

  it(
    "carries a bearer token through a real scan against a gated endpoint",
    async () => {
      // the gateway is reached from the host, but inferno runs in docker
      const gateway = process.env.AUTHGW_URL ?? "http://localhost:8090";
      const gatewayFromInferno =
        process.env.AUTHGW_INTERNAL_URL ?? "http://host.docker.internal:8090";

      const token = await mintToken(gateway);
      expect(token).toBeTruthy();

      const unauthorized = await fetch(`${gateway}/metadata`);
      expect(unauthorized.status).toBe(401);

      const authorized = await fetch(`${gateway}/metadata`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(authorized.status).toBe(200);

      const sessionId = await client.createSession(planNet.suiteId);
      const suite = await client.suite(planNet.suiteId);
      const inputs = requiredSuiteInputs(suite, {
        url: gatewayFromInferno,
        max_instances: "1",
        max_pages: "1",
        smart_auth_info: JSON.stringify({
          auth_type: "backend_services",
          token_url: `${gatewayFromInferno}/token`,
          client_id: "fhirfix-test-client",
          requested_scopes: "system/*.read",
          access_token: token,
          expires_in: 300,
        }),
      });

      const started = await client.startRun(sessionId, planNet.suiteId, inputs);
      const deadline = Date.now() + 5 * 60 * 1000;
      let results: InfernoTestResult[] = [];
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 4000));
        const run = await client.getRun(started.id);
        results = run.results ?? results;
        if (run.status === "done" || run.status === "cancelled") break;
      }
      await client.cancelRun(started.id).catch(() => {});

      // this gateway 401s every unauthenticated read, so few denials proves the token landed
      const denied = results.filter((r) => (r.result_message ?? "").includes("401")).length;
      expect(results.length).toBeGreaterThan(0);
      expect(denied).toBeLessThan(5);
    },
    6 * 60 * 1000,
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
