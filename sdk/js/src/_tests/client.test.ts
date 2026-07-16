// unit tests for client behavior that real http cannot exercise on demand:
// retry/backoff decisions, header construction, and the error mapping table.
// the fetch injection point (options.fetch) exists for exactly this.

import { describe, expect, test } from "bun:test";
import type { ApiError, RateLimitError } from "../index.js";
// these are all VALUE imports on purpose: the error classes are used as runtime
// constructors in the mapping table below, not only in type positions.
import * as sdk from "../index.js";
import { ConnectionError, Fhirfix, FhirfixError, ServerError, TimeoutError } from "../index.js";

const BASE = "https://api.example.test/api/v1";

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

// a fetch stub that records calls and replays a queue of responses. a Response
// body can only be read once, so a queued Response is cloned per call - otherwise
// the last-entry repeat (used to model "keeps failing") throws ERR_BODY_ALREADY_USED
// and masks what the client actually did.
function stubFetch(responses: Array<Response | (() => Response | Promise<Response>)>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses[Math.min(i, responses.length - 1)];
    i++;
    if (typeof next === "function") return await next();
    return next?.clone();
  }) as unknown as typeof globalThis.fetch;
  return { impl, calls, count: () => i };
}

type Stub = ReturnType<typeof stubFetch>;

// read the headers of the nth recorded call. asserts the call happened first, so a
// missing call fails as "expected a call" instead of a confusing TypeError.
function headersOf(stub: Stub, index: number): Record<string, string> {
  const call = stub.calls[index];
  expect(call).toBeDefined();
  return (call?.init.headers ?? {}) as Record<string, string>;
}

describe("construction", () => {
  test("throws a clear error when no key is given", () => {
    // guard: the env var must not leak in and make this pass by accident.
    const saved = process.env.FHIRFIX_API_KEY;
    delete process.env.FHIRFIX_API_KEY;
    try {
      expect(() => new Fhirfix({ baseUrl: BASE })).toThrow(FhirfixError);
      expect(() => new Fhirfix({ baseUrl: BASE })).toThrow(/FHIRFIX_API_KEY/);
    } finally {
      if (saved) process.env.FHIRFIX_API_KEY = saved;
    }
  });

  test("reads the key from FHIRFIX_API_KEY", () => {
    const saved = process.env.FHIRFIX_API_KEY;
    process.env.FHIRFIX_API_KEY = "ffx_test_fromenv";
    try {
      const client = new Fhirfix({ baseUrl: BASE });
      expect(client.baseUrl).toBe(BASE);
    } finally {
      if (saved) process.env.FHIRFIX_API_KEY = saved;
      else delete process.env.FHIRFIX_API_KEY;
    }
  });

  test("throws when no base url is given", () => {
    // there is no public host, so there is no default. a client must be told
    // where the API is rather than silently resolving a host that does not exist.
    const saved = process.env.FHIRFIX_BASE_URL;
    delete process.env.FHIRFIX_BASE_URL;
    try {
      expect(() => new Fhirfix({ apiKey: "ffx_test_x" })).toThrow(FhirfixError);
      expect(() => new Fhirfix({ apiKey: "ffx_test_x" })).toThrow(/FHIRFIX_BASE_URL/);
    } finally {
      if (saved) process.env.FHIRFIX_BASE_URL = saved;
    }
  });

  test("reads the base url from FHIRFIX_BASE_URL", () => {
    const saved = process.env.FHIRFIX_BASE_URL;
    process.env.FHIRFIX_BASE_URL = "http://from-env/api/v1";
    try {
      expect(new Fhirfix({ apiKey: "k" }).baseUrl).toBe("http://from-env/api/v1");
      // an explicit option still wins over the environment.
      expect(new Fhirfix({ apiKey: "k", baseUrl: BASE }).baseUrl).toBe(BASE);
    } finally {
      if (saved) process.env.FHIRFIX_BASE_URL = saved;
      else delete process.env.FHIRFIX_BASE_URL;
    }
  });

  test("strips a trailing slash so urls never double up", async () => {
    const stub = stubFetch([jsonResponse(200, { ok: true })]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: `${BASE}/`, fetch: stub.impl });
    expect(client.baseUrl).toBe(BASE);
    await client.ping();
    expect(stub.calls[0]?.url).toBe(`${BASE}/ping`);
  });
});

describe("request shape", () => {
  test("sends the bearer key and json content type", async () => {
    const stub = stubFetch([jsonResponse(200, { runId: "run_1" })]);
    const client = new Fhirfix({ apiKey: "ffx_test_abc", baseUrl: BASE, fetch: stub.impl });
    await client.validate({ input: "{}" });
    const headers = headersOf(stub, 0);
    expect(headers.Authorization).toBe("Bearer ffx_test_abc");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  test("sends Idempotency-Key only when one is given", async () => {
    const stub = stubFetch([jsonResponse(200, {}), jsonResponse(200, {})]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl });

    await client.validate({ input: "{}" });
    expect(headersOf(stub, 0)["Idempotency-Key"]).toBeUndefined();

    await client.validate({ input: "{}", idempotencyKey: "abc-123" });
    expect(headersOf(stub, 1)["Idempotency-Key"]).toBe("abc-123");
  });

  test("serializes the documented body keys only", async () => {
    const stub = stubFetch([jsonResponse(200, {})]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl });
    await client.fix({ input: "{}", profiles: ["http://p"], redact: true, idempotencyKey: "x" });
    const body = JSON.parse(stub.calls[0]?.init.body as string);
    // idempotencyKey is a header, never a body field.
    expect(body).toEqual({ input: "{}", profiles: ["http://p"], redact: true });
  });

  test("builds run list query params and encodes dates as iso", async () => {
    const stub = stubFetch([jsonResponse(200, { runs: [], nextCursor: null, hasMore: false })]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl });
    await client.runs.list({
      status: "completed",
      limit: 5,
      from: new Date("2026-01-01T00:00:00Z"),
    });
    const url = new URL(stub.calls[0]?.url ?? "");
    expect(url.searchParams.get("status")).toBe("completed");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("from")).toBe("2026-01-01T00:00:00.000Z");
    // undefined filters must not appear at all.
    expect(url.searchParams.has("inputType")).toBe(false);
  });

  test("percent-encodes a run id into the path", async () => {
    const stub = stubFetch([jsonResponse(200, { run: {}, findings: [] })]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl });
    await client.runs.get("run_a/../b");
    expect(stub.calls[0]?.url).toBe(`${BASE}/runs/run_a%2F..%2Fb`);
  });
});

describe("error mapping", () => {
  const cases: Array<[number, string, unknown]> = [
    [400, "bad_request", sdk.BadRequestError],
    [413, "too_large", sdk.BadRequestError],
    [401, "unauthorized", sdk.AuthenticationError],
    [403, "forbidden", sdk.PermissionDeniedError],
    [402, "out_of_credits", sdk.OutOfCreditsError],
    [404, "not_found", sdk.NotFoundError],
    [409, "idempotency_conflict", sdk.ConflictError],
    [422, "unprocessable", sdk.UnprocessableError],
    [429, "rate_limited", sdk.RateLimitError],
    [503, "sidecar_unavailable", sdk.ServerError],
  ];

  for (const [status, code, ctor] of cases) {
    test(`maps ${status} ${code} to its own error class`, async () => {
      const stub = stubFetch([jsonResponse(status, { error: code, message: "nope" })]);
      // maxRetries 0: 429/5xx would otherwise retry and slow the test down.
      const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 0 });
      try {
        await client.validate({ input: "{}" });
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ctor as never);
        expect((err as ApiError).status).toBe(status);
        expect((err as ApiError).code).toBe(code);
        expect((err as ApiError).message).toBe("nope");
      }
    });
  }

  test("a non-json error body still produces an ApiError", async () => {
    const stub = stubFetch([
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    ]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 0 });
    try {
      await client.validate({ input: "{}" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ServerError);
      expect((err as ApiError).code).toBe("unknown");
      // the raw text is surfaced, not swallowed - that is what a caller debugs with.
      expect((err as ApiError).message).toContain("502");
    }
  });

  test("RateLimitError reads retryAfter from the header", async () => {
    const stub = stubFetch([
      jsonResponse(429, { error: "rate_limited", message: "slow down" }, { "Retry-After": "7" }),
    ]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 0 });
    try {
      await client.validate({ input: "{}" });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(sdk.RateLimitError);
      expect((err as RateLimitError).retryAfter).toBe(7);
    }
  });

  test("every SDK error is catchable as FhirfixError", async () => {
    const stub = stubFetch([jsonResponse(401, { error: "unauthorized", message: "no" })]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 0 });
    expect(client.ping()).rejects.toBeInstanceOf(FhirfixError);
  });
});

describe("retry policy", () => {
  test("retries a 429 and succeeds, using Retry-After", async () => {
    const stub = stubFetch([
      jsonResponse(429, { error: "rate_limited", message: "slow" }, { "Retry-After": "0" }),
      jsonResponse(200, { runId: "run_ok", findings: [] }),
    ]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 2 });
    const result = await client.validate({ input: "{}" });
    expect(result.runId).toBe("run_ok");
    expect(stub.count()).toBe(2);
  });

  test("retries a 500 then gives up after maxRetries", async () => {
    const stub = stubFetch([jsonResponse(500, { error: "internal", message: "boom" })]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 1 });
    await expect(client.ping()).rejects.toBeInstanceOf(ServerError);
    // exactly 1 initial + 1 retry, then it stops.
    expect(stub.count()).toBe(2);
  });

  test("never retries a 4xx the caller must fix", async () => {
    const stub = stubFetch([jsonResponse(422, { error: "unprocessable", message: "bad shape" })]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 3 });
    await client.validate({ input: "x" }).catch(() => {});
    // exactly one attempt: retrying an unprocessable body wastes the caller's time.
    expect(stub.count()).toBe(1);
  });

  test("wraps a network failure as ConnectionError", async () => {
    const stub = stubFetch([
      () => {
        throw new TypeError("fetch failed");
      },
    ]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 0 });
    try {
      await client.ping();
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConnectionError);
      expect((err as ConnectionError).message).toContain(BASE);
      // the original cause is preserved for debugging.
      expect((err as ConnectionError).cause).toBeInstanceOf(TypeError);
    }
  });

  test("surfaces a timeout as TimeoutError", async () => {
    const stub = stubFetch([
      () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      },
    ]);
    const client = new Fhirfix({ apiKey: "k", baseUrl: BASE, fetch: stub.impl, maxRetries: 0 });
    try {
      await client.ping();
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TimeoutError);
      // TimeoutError is a ConnectionError, so one catch covers both.
      expect(err).toBeInstanceOf(ConnectionError);
    }
  });
});
