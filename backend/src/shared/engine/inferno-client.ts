import { CircuitBreaker, type ResilienceOptions, resilientFetch, SidecarError } from "./resilience";

export interface InfernoOptions {
  baseUrl: string;
  resilience?: Partial<ResilienceOptions>;
}

export const INFERNO_RESULTS = [
  "pass",
  "fail",
  "skip",
  "omit",
  "error",
  "running",
  "wait",
  "cancel",
] as const;

export type InfernoResult = (typeof INFERNO_RESULTS)[number];

export const TERMINAL_RUN_STATUSES = ["done", "cancelling"] as const;

export interface AuthInfo {
  auth_type?: string;
  token_url?: string;
  auth_url?: string;
  requested_scopes?: string;
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  use_discovery?: string;
}

export interface InfernoInput {
  name: string;
  value: string;
}

export interface InfernoMessage {
  type: "error" | "warning" | "info";
  message: string;
}

export interface InfernoTestResult {
  id: string;
  result: InfernoResult;
  test_id?: string;
  test_group_id?: string;
  test_suite_id?: string;
  result_message?: string;
  messages?: InfernoMessage[];
  updated_at?: string;
}

export interface InfernoTestRun {
  id: string;
  test_session_id: string;
  status?: string;
  test_count?: number;
  results?: InfernoTestResult[];
}

export interface InfernoRequirement {
  id: string;
  requirement: string;
  conformance: string;
  actors: string[];
  url?: string;
  subrequirements?: string[];
  not_tested_reason?: string;
}

export interface InfernoTestNode {
  id: string;
  short_title?: string;
  title?: string;
  verifies_requirements?: string[];
  tests?: InfernoTestNode[];
  test_groups?: InfernoTestNode[];
}

export interface InfernoSuiteInput {
  name: string;
  optional?: boolean;
  type?: string;
  default?: string;
}

export interface InfernoSuite extends InfernoTestNode {
  version?: string;
  requirement_sets?: Array<{ identifier: string; title?: string }>;
  test_groups?: InfernoTestNode[];
  inputs?: InfernoSuiteInput[];
}

export class InfernoClient {
  private readonly breaker: CircuitBreaker;

  constructor(private readonly opts: InfernoOptions) {
    this.breaker = new CircuitBreaker(`inferno@${opts.baseUrl}`, {
      timeoutMs: 30_000,
      retries: 2,
      backoffBaseMs: 300,
      circuitThreshold: 5,
      circuitResetMs: 15_000,
      ...opts.resilience,
    });
  }

  private url(path: string): string {
    return `${this.opts.baseUrl}/api${path}`;
  }

  private async json<T>(label: string, path: string, init: RequestInit): Promise<T> {
    const res = await resilientFetch(
      label,
      this.breaker,
      this.url(path),
      init,
      this.opts.resilience,
    );
    return (await res.json()) as T;
  }

  async version(): Promise<string> {
    const body = await this.json<{ version?: string }>("inferno.version", "/version", {
      method: "GET",
    });
    return body.version ?? "unknown";
  }

  async ready(): Promise<boolean> {
    try {
      await this.version();
      return true;
    } catch {
      return false;
    }
  }

  async suite(suiteId: string): Promise<InfernoSuite> {
    return this.json<InfernoSuite>("inferno.suite", `/test_suites/${suiteId}`, { method: "GET" });
  }

  async requirements(suiteId: string): Promise<InfernoRequirement[]> {
    return this.json<InfernoRequirement[]>(
      "inferno.requirements",
      `/test_suites/${suiteId}/requirements`,
      { method: "GET" },
    );
  }

  async createSession(
    suiteId: string,
    suiteOptions?: Array<{ id: string; value: string }>,
  ): Promise<string> {
    const body = await this.json<{ id?: string }>("inferno.createSession", "/test_sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_suite_id: suiteId, suite_options: suiteOptions ?? [] }),
    });
    if (!body.id) throw new SidecarError("inferno returned a session with no id", "inferno");
    return body.id;
  }

  // one session must never get a second concurrent run or inferno answers 409
  async startRun(
    sessionId: string,
    suiteId: string,
    inputs: InfernoInput[],
  ): Promise<InfernoTestRun> {
    return this.json<InfernoTestRun>("inferno.startRun", "/test_runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test_session_id: sessionId, test_suite_id: suiteId, inputs }),
    });
  }

  async getRun(runId: string, after?: string): Promise<InfernoTestRun> {
    const query = after ? `&after=${encodeURIComponent(after)}` : "";
    return this.json<InfernoTestRun>(
      "inferno.getRun",
      `/test_runs/${runId}?include_results=true${query}`,
      { method: "GET" },
    );
  }

  async runResults(runId: string): Promise<InfernoTestResult[]> {
    return this.json<InfernoTestResult[]>("inferno.runResults", `/test_runs/${runId}/results`, {
      method: "GET",
    });
  }

  // inferno answers 204 even for an unknown run, so resolving proves nothing
  async cancelRun(runId: string): Promise<void> {
    await resilientFetch(
      "inferno.cancelRun",
      this.breaker,
      this.url(`/test_runs/${runId}`),
      { method: "DELETE" },
      { ...this.opts.resilience, retries: 0 },
    );
  }
}

export function isRunFinished(run: InfernoTestRun): boolean {
  const status = run.status ?? "";
  return status === "done" || status === "cancelled";
}

// a run must send every non-optional input the suite declares or inferno 422s
export function requiredSuiteInputs(
  suite: InfernoSuite,
  provided: Record<string, string>,
): InfernoInput[] {
  const inputs: InfernoInput[] = [];
  for (const declared of suite.inputs ?? []) {
    const override = provided[declared.name];
    if (override !== undefined) {
      inputs.push({ name: declared.name, value: override });
      continue;
    }
    if (declared.optional) continue;
    if (declared.default === undefined) continue;
    inputs.push({ name: declared.name, value: declared.default });
  }
  return inputs;
}

export function flattenRequirementIds(node: InfernoTestNode): Map<string, string[]> {
  const byRequirement = new Map<string, string[]>();
  const walk = (n: InfernoTestNode): void => {
    for (const req of n.verifies_requirements ?? []) {
      const existing = byRequirement.get(req);
      if (existing) existing.push(n.id);
      else byRequirement.set(req, [n.id]);
    }
    for (const child of n.tests ?? []) walk(child);
    for (const child of n.test_groups ?? []) walk(child);
  };
  walk(node);
  return byRequirement;
}
