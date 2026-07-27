import { describe, expect, test } from "bun:test";
import {
  ApiError,
  AuthenticationError,
  BadRequestError,
  ConflictError,
  ConnectionError,
  NotFoundError,
  OutOfCreditsError,
  PermissionDeniedError,
  RateLimitError,
  ServerError,
  TimeoutError,
  UnprocessableError,
} from "fhirfix";
import { exitCodeFor } from "../cli.js";
import { EXIT } from "../exit-codes.js";


const headers = new Headers();

describe("exitCodeFor", () => {
  test("a bad key exits auth (3)", () => {
    expect(exitCodeFor(new AuthenticationError(401, "unauthorized", "no", headers, {}))).toBe(
      EXIT.auth,
    );
  });

  test("a missing scope exits auth (3), not usage", () => {
    // the key is real but cannot do this - same operator fix as a bad key.
    expect(exitCodeFor(new PermissionDeniedError(403, "forbidden", "no", headers, {}))).toBe(
      EXIT.auth,
    );
  });

  test("out of credits exits credits (4), distinct from auth", () => {
    // a pipeline should be able to alert on billing separately from a broken key.
    expect(exitCodeFor(new OutOfCreditsError(402, "out_of_credits", "broke", headers, {}))).toBe(
      EXIT.credits,
    );
  });

  test("unparseable input exits input (6)", () => {
    expect(exitCodeFor(new UnprocessableError(422, "unprocessable", "nope", headers, {}))).toBe(
      EXIT.input,
    );
  });

  test("a too-large or malformed body exits input (6)", () => {
    expect(exitCodeFor(new BadRequestError(413, "too_large", "big", headers, {}))).toBe(EXIT.input);
  });

  test("an unreachable API exits unavailable (5)", () => {
    expect(exitCodeFor(new ConnectionError("refused", new Error("ECONNREFUSED")))).toBe(
      EXIT.unavailable,
    );
  });

  test("a timeout exits unavailable (5)", () => {
    expect(exitCodeFor(new TimeoutError("timed out", new Error("t")))).toBe(EXIT.unavailable);
  });

  test("a sidecar outage (503) exits unavailable (5), not input", () => {
    // this is our fault, not the caller's: it must be distinguishable in CI.
    expect(exitCodeFor(new ServerError(503, "sidecar_unavailable", "down", headers, {}))).toBe(
      EXIT.unavailable,
    );
  });

  test("an idempotency conflict exits input (6)", () => {
    expect(exitCodeFor(new ConflictError(409, "idempotency_conflict", "dup", headers, {}))).toBe(
      EXIT.input,
    );
  });

  test("a 404 exits input (6)", () => {
    expect(exitCodeFor(new NotFoundError(404, "not_found", "gone", headers, {}))).toBe(EXIT.input);
  });

  test("a rate limit that survived retries exits unavailable (5), not input", () => {
    const err = new RateLimitError(429, "rate_limited", "slow", headers, {}, 30);
    expect(exitCodeFor(err)).toBe(EXIT.unavailable);
  });

  test("an unknown non-SDK error exits unavailable (5), never 0 or 1", () => {
    const code = exitCodeFor(new Error("something odd"));
    expect(code).not.toBe(EXIT.ok);
    expect(code).not.toBe(EXIT.findings);
  });

  test("a generic ApiError still maps to a real failure code", () => {
    const code = exitCodeFor(new ApiError(418, "teapot", "short and stout", headers, {}));
    expect(code).not.toBe(EXIT.ok);
  });
});
