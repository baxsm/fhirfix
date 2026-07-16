import {
  ApiError,
  ConnectionError,
  FhirfixError,
  RateLimitError,
  ServerError,
  TimeoutError,
} from "./errors.js";
import type {
  BatchResult,
  ConvertResult,
  FixResult,
  ListRunsParams,
  PingResult,
  ReportFormat,
  RunDetail,
  RunInput,
  RunPage,
  ValidateResult,
} from "./types.js";

// no default base url on purpose: there is no public host yet, and defaulting to
// one that does not exist would fail at request time with a DNS error instead of
// at construction with something a caller can act on.
// the engine runs synchronously against the validator/converter sidecars, so a
// fix on a large bundle is slow by nature. this is well above the observed p99.
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_RETRIES = 2;

export interface ClientOptions {
  // an API key: ffx_test_... or ffx_live_.... falls back to $FHIRFIX_API_KEY.
  apiKey?: string;
  // where the API lives, e.g. http://localhost:3001/api/v1. required: falls back
  // to $FHIRFIX_BASE_URL, and there is no built-in default.
  baseUrl?: string;
  // per-request timeout in ms.
  timeoutMs?: number;
  // retries for 429 and 5xx only. never retries a 4xx the caller must fix.
  maxRetries?: number;
  // swap the fetch implementation (tests, proxies, custom agents).
  fetch?: typeof globalThis.fetch;
}

interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  idempotencyKey?: string;
  // parse json (default) or return the raw response for binary artifacts.
  raw?: boolean;
}

// read an env var without assuming node: the SDK also runs in browsers and
// workers, where `process` is not defined.
function readEnv(name: string): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// full-jitter backoff. the jitter matters: without it, every client that got
// rate-limited in the same window retries in the same instant and re-triggers it.
function backoffMs(attempt: number): number {
  const capped = Math.min(1000 * 2 ** attempt, 8000);
  return Math.random() * capped;
}

/**
 * The FHIRfix REST API client.
 *
 * const fhirfix = new Fhirfix({ apiKey: "ffx_test_..." });
 * const result = await fhirfix.fix({ input: patientJson });
 */
export class Fhirfix {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof globalThis.fetch;

  constructor(options: ClientOptions = {}) {
    const apiKey = options.apiKey ?? readEnv("FHIRFIX_API_KEY");
    if (!apiKey) {
      throw new FhirfixError(
        "No API key. Pass { apiKey } or set the FHIRFIX_API_KEY environment variable.",
      );
    }
    this.apiKey = apiKey;

    const baseUrl = options.baseUrl ?? readEnv("FHIRFIX_BASE_URL");
    if (!baseUrl) {
      throw new FhirfixError(
        "No base URL. Pass { baseUrl } or set the FHIRFIX_BASE_URL environment variable, " +
          'e.g. "http://localhost:3001/api/v1".',
      );
    }
    // tolerate a trailing slash so baseUrl + path never doubles up.
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    // bind: an unbound global fetch throws "Illegal invocation" in browsers.
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, body, query, idempotencyKey, raw } = options;

    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      // the transport try covers ONLY fetch itself. an ApiError built from a real
      // http response must never fall into this catch, or a non-retryable 4xx
      // would be retried anyway.
      let response: Response;
      try {
        response = await this.fetchImpl(url.toString(), {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        });
      } catch (err) {
        // AbortSignal.timeout aborts with a TimeoutError DOMException.
        const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
        const wrapped = isTimeout
          ? new TimeoutError(`Request timed out after ${this.timeoutMs}ms.`, err)
          : new ConnectionError(
              `Could not reach the FHIRfix API at ${this.baseUrl}: ${
                err instanceof Error ? err.message : String(err)
              }`,
              err,
            );
        // a network blip is worth another try; the caller set the budget.
        if (attempt === this.maxRetries) throw wrapped;
        lastError = wrapped;
        await sleep(backoffMs(attempt));
        continue;
      }

      if (response.ok) {
        if (raw) return response as unknown as T;
        return (await response.json()) as T;
      }

      const text = await response.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = undefined;
      }
      const error = ApiError.from(response.status, response.headers, parsed, text);

      // only 429 and 5xx are worth retrying. a 401/403/409/422 fails identically
      // on every attempt, so retrying just wastes the caller's time and quota.
      const retryable = error instanceof RateLimitError || error instanceof ServerError;
      if (!retryable || attempt === this.maxRetries) throw error;

      // honour Retry-After when the server sent one; it knows its own window.
      const wait =
        error instanceof RateLimitError && error.retryAfter != null
          ? error.retryAfter * 1000
          : backoffMs(attempt);
      lastError = error;
      await sleep(wait);
    }
    // unreachable: the loop either returns or throws on the final attempt.
    throw lastError instanceof Error ? lastError : new FhirfixError("Request failed.");
  }

  // confirm a key works and see its mode + scopes. costs no credits.
  ping(): Promise<PingResult> {
    return this.request<PingResult>({ method: "GET", path: "/ping" });
  }

  // validate a resource, bundle, or HL7v2 message. no fixes applied.
  validate(input: RunInput): Promise<ValidateResult> {
    return this.request<ValidateResult>({
      method: "POST",
      path: "/validate",
      body: { input: input.input, profiles: input.profiles, redact: input.redact },
      idempotencyKey: input.idempotencyKey,
    });
  }

  // validate, apply safe fixes, re-verify, and return the corrected artifact.
  fix(input: RunInput): Promise<FixResult> {
    return this.request<FixResult>({
      method: "POST",
      path: "/fix",
      body: { input: input.input, profiles: input.profiles, redact: input.redact },
      idempotencyKey: input.idempotencyKey,
    });
  }

  // convert HL7v2 / C-CDA to FHIR, applying the workspace mapping registry.
  convert(input: RunInput): Promise<ConvertResult> {
    return this.request<ConvertResult>({
      method: "POST",
      path: "/convert",
      body: { input: input.input, profiles: input.profiles, redact: input.redact },
      idempotencyKey: input.idempotencyKey,
    });
  }

  // submit a large input as one async run. returns immediately; completion arrives
  // by run.completed webhook, or poll runs.get(runId).
  batch(input: RunInput & { autoFix?: boolean }): Promise<BatchResult> {
    return this.request<BatchResult>({
      method: "POST",
      path: "/batch",
      body: { input: input.input, profiles: input.profiles, autoFix: input.autoFix },
      idempotencyKey: input.idempotencyKey,
    });
  }

  readonly runs = {
    // list runs, newest first. pass nextCursor from the previous page to paginate.
    list: (params: ListRunsParams = {}): Promise<RunPage> => {
      const { status, inputType, from, to, cursor, limit } = params;
      return this.request<RunPage>({
        method: "GET",
        path: "/runs",
        query: {
          status,
          inputType,
          from: from instanceof Date ? from.toISOString() : from,
          to: to instanceof Date ? to.toISOString() : to,
          cursor,
          limit,
        },
      });
    },

    // one run plus its findings.
    get: (runId: string): Promise<RunDetail> =>
      this.request<RunDetail>({ method: "GET", path: `/runs/${encodeURIComponent(runId)}` }),

    // the corrected artifact as text, in its original format.
    corrected: async (runId: string): Promise<string> => {
      const response = await this.request<Response>({
        method: "GET",
        path: `/runs/${encodeURIComponent(runId)}/corrected`,
        raw: true,
      });
      return response.text();
    },

    // the report as json, a FHIR OperationOutcome, or a pdf.
    // json/operationoutcome come back as text; pdf as bytes.
    report: async (runId: string, format: ReportFormat = "json"): Promise<string> => {
      const response = await this.request<Response>({
        method: "GET",
        path: `/runs/${encodeURIComponent(runId)}/report`,
        query: { format },
        raw: true,
      });
      return response.text();
    },

    reportBytes: async (runId: string, format: ReportFormat = "pdf"): Promise<ArrayBuffer> => {
      const response = await this.request<Response>({
        method: "GET",
        path: `/runs/${encodeURIComponent(runId)}/report`,
        query: { format },
        raw: true,
      });
      return response.arrayBuffer();
    },
  };
}
