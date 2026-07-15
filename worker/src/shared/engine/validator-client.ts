import type { OperationOutcome } from "./types";
import { CircuitBreaker, type ResilienceOptions, resilientFetch, SidecarError } from "./resilience";

// one warm HAPI validator instance. holds ~2GB of loaded IG packages, so scaling
// the app does not scale the validator. the pool below routes across instances.
export interface ValidatorInstance {
  baseUrl: string;
  maxInFlight: number; // per-instance concurrency cap
}

interface InstanceState {
  cfg: ValidatorInstance;
  breaker: CircuitBreaker;
  inFlight: number;
  ready: boolean;
}

export interface ValidatorPoolOptions {
  instances: ValidatorInstance[];
  requiredIgs: Array<{ id: string; version: string }>; // e.g. us core 6.1.0
  resilience?: Partial<ResilienceOptions>;
  acquireTimeoutMs?: number; // how long a run waits for a free slot before failing
  pollIntervalMs?: number;
}

// a ready-gated pool. picks a ready instance with a free slot; when all are
// saturated the caller waits in queue rather than piling onto one instance.
export class ValidatorPool {
  private readonly states: InstanceState[];
  private readonly opts: Required<Pick<ValidatorPoolOptions, "acquireTimeoutMs" | "pollIntervalMs">>;
  private readonly requiredIgs: Array<{ id: string; version: string }>;
  private readonly resilience?: Partial<ResilienceOptions>;

  constructor(options: ValidatorPoolOptions) {
    this.requiredIgs = options.requiredIgs;
    this.resilience = options.resilience;
    this.opts = {
      acquireTimeoutMs: options.acquireTimeoutMs ?? 120_000,
      pollIntervalMs: options.pollIntervalMs ?? 50,
    };
    this.states = options.instances.map((cfg) => ({
      cfg,
      breaker: new CircuitBreaker(`validator@${cfg.baseUrl}`, {
        timeoutMs: 30_000,
        retries: 2,
        backoffBaseMs: 300,
        circuitThreshold: 5,
        circuitResetMs: 15_000,
        ...options.resilience,
      }),
      inFlight: 0,
      ready: false,
    }));
  }

  // load the required IGs into every instance and mark it ready. degrade gracefully:
  // the pool is usable once at least one instance reports ready.
  async warmup(): Promise<{ readyCount: number }> {
    await Promise.all(
      this.states.map(async (st) => {
        try {
          for (const ig of this.requiredIgs) {
            await resilientFetch(
              "validator.loadIg",
              st.breaker,
              `${st.cfg.baseUrl}/igs/${ig.id}?version=${ig.version}`,
              { method: "PUT" },
              { ...this.resilience, timeoutMs: 180_000, retries: 1 },
            );
          }
          st.ready = await this.probeReady(st);
        } catch {
          st.ready = false;
        }
      }),
    );
    return { readyCount: this.states.filter((s) => s.ready).length };
  }

  private async probeReady(st: InstanceState): Promise<boolean> {
    try {
      const res = await resilientFetch(
        "validator.profiles",
        st.breaker,
        `${st.cfg.baseUrl}/profiles`,
        { method: "GET" },
        { ...this.resilience, timeoutMs: 10_000, retries: 1 },
      );
      const profiles = (await res.json()) as string[];
      // ready only when the required IGs' profiles are actually present.
      return this.requiredIgs.every((ig) =>
        profiles.some((p) => p.includes(igCanonicalHint(ig.id))),
      );
    } catch {
      return false;
    }
  }

  get readyCount(): number {
    return this.states.filter((s) => s.ready).length;
  }

  // validate one resource against one or more profiles. acquires a slot on a ready
  // instance, waiting in queue if all are saturated.
  async validate(resource: unknown, profiles: string[]): Promise<OperationOutcome> {
    const st = await this.acquire();
    try {
      const query = profiles.map((p) => `profile=${encodeURIComponent(p)}`).join("&");
      const res = await resilientFetch(
        "validator.validate",
        st.breaker,
        `${st.cfg.baseUrl}/validate?${query}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resource),
        },
        this.resilience,
      );
      return (await res.json()) as OperationOutcome;
    } finally {
      st.inFlight -= 1;
    }
  }

  private async acquire(): Promise<InstanceState> {
    const deadline = Date.now() + this.opts.acquireTimeoutMs;
    for (;;) {
      const candidate = this.states
        .filter((s) => s.ready && !s.breaker.isOpen && s.inFlight < s.cfg.maxInFlight)
        .sort((a, b) => a.inFlight - b.inFlight)[0];
      if (candidate) {
        candidate.inFlight += 1;
        return candidate;
      }
      if (this.states.every((s) => !s.ready || s.breaker.isOpen)) {
        throw new SidecarError("no ready validator instance available", "validator.pool");
      }
      if (Date.now() >= deadline) {
        throw new SidecarError("timed out waiting for a free validator slot", "validator.pool");
      }
      await new Promise((r) => setTimeout(r, this.opts.pollIntervalMs));
    }
  }
}

// map an npm ig id to a substring that appears in its profile canonical urls,
// used to confirm the ig actually loaded (not just that the PUT returned 200).
function igCanonicalHint(igId: string): string {
  if (igId.startsWith("hl7.fhir.us.core")) return "/us/core/";
  if (igId.includes("davinci-pas")) return "/us/davinci-pas/";
  if (igId.includes("davinci-pdex")) return "/us/davinci-pdex/";
  // fall back to the dotted-to-slashed heuristic for other igs.
  return igId.split(".").slice(-2).join("/");
}
