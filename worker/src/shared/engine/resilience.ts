// timeout + retry-with-backoff + circuit breaker shared by both sidecar clients.
// the phase-2 spec calls sidecar reliability the biggest operational risk, so this
// is a real implementation, not a passthrough.

export class SidecarError extends Error {
  constructor(
    message: string,
    readonly sidecar: string,
    readonly upstreamStatus?: number,
    readonly upstreamBody?: string,
  ) {
    super(message);
    this.name = "SidecarError";
  }
}

// every SidecarError message already starts with the sidecar name (see the throw
// sites below), so prefixing `sidecar` again produced "validator.validate:
// validator.validate unreachable". the upstream body is the sidecar's own reason
// for a 4xx/5xx and was being dropped entirely, which is the one detail worth
// keeping when a run fails against a real service.
export function describeSidecarError(err: SidecarError): string {
  const status = err.upstreamStatus ? ` (${err.upstreamStatus})` : "";
  const body = err.upstreamBody?.trim();
  if (!body) return `${err.message}${status}`;
  // the body can be a whole html error page; keep it useful, not enormous.
  const trimmed = body.length > 500 ? `${body.slice(0, 500)}...` : body;
  return `${err.message}${status}: ${trimmed}`;
}

export class CircuitOpenError extends SidecarError {
  constructor(sidecar: string) {
    super(`${sidecar} circuit is open (too many recent failures)`, sidecar);
    this.name = "CircuitOpenError";
  }
}

export interface ResilienceOptions {
  timeoutMs: number;
  retries: number;
  backoffBaseMs: number;
  circuitThreshold: number; // consecutive failures before opening
  circuitResetMs: number; // how long the circuit stays open
  now?: () => number; // injectable clock for tests
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULTS: ResilienceOptions = {
  timeoutMs: 30_000,
  retries: 2,
  backoffBaseMs: 300,
  circuitThreshold: 5,
  circuitResetMs: 15_000,
};

// one breaker per sidecar instance. tracks consecutive failures and an open-until time.
export class CircuitBreaker {
  private consecutiveFailures = 0;
  private openUntil = 0;
  constructor(
    private readonly name: string,
    private readonly opts: ResilienceOptions,
  ) {}

  private now(): number {
    return this.opts.now ? this.opts.now() : Date.now();
  }

  get isOpen(): boolean {
    if (this.openUntil === 0) return false;
    if (this.now() >= this.openUntil) {
      // half-open: allow one trial through by clearing the gate.
      this.openUntil = 0;
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.openUntil = 0;
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= this.opts.circuitThreshold) {
      this.openUntil = this.now() + this.opts.circuitResetMs;
    }
  }

  assertClosed(): void {
    if (this.isOpen) throw new CircuitOpenError(this.name);
  }
}

function isRetryableStatus(status: number): boolean {
  // 5xx and 429 are transient; 4xx (bad request) is not.
  return status >= 500 || status === 429;
}

// run an HTTP call through timeout + retry + breaker. returns the Response on 2xx.
export async function resilientFetch(
  name: string,
  breaker: CircuitBreaker,
  url: string,
  init: RequestInit,
  optsIn?: Partial<ResilienceOptions>,
): Promise<Response> {
  const opts = { ...DEFAULTS, ...optsIn };
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  breaker.assertClosed();

  let lastErr: SidecarError | undefined;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        breaker.recordSuccess();
        return res;
      }
      const body = await safeText(res);
      if (!isRetryableStatus(res.status) || attempt === opts.retries) {
        breaker.recordFailure();
        throw new SidecarError(
          `${name} returned ${res.status}`,
          name,
          res.status,
          body,
        );
      }
      lastErr = new SidecarError(`${name} returned ${res.status}`, name, res.status, body);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof SidecarError) {
        if (err.upstreamStatus && !isRetryableStatus(err.upstreamStatus)) throw err;
        lastErr = err;
      } else {
        const aborted = err instanceof Error && err.name === "AbortError";
        lastErr = new SidecarError(
          aborted ? `${name} timed out after ${opts.timeoutMs}ms` : `${name} unreachable: ${String(err)}`,
          name,
        );
      }
      if (attempt === opts.retries) {
        breaker.recordFailure();
        throw lastErr;
      }
    }
    // exponential backoff before the next attempt.
    await sleep(opts.backoffBaseMs * 2 ** attempt);
  }
  breaker.recordFailure();
  throw lastErr ?? new SidecarError(`${name} failed`, name);
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 2000);
  } catch {
    return "";
  }
}
