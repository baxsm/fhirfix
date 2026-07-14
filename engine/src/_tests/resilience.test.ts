import { describe, expect, it, vi } from "vitest";
import { CircuitBreaker, CircuitOpenError, resilientFetch, SidecarError } from "../resilience";

const opts = {
  timeoutMs: 1000,
  retries: 2,
  backoffBaseMs: 1,
  circuitThreshold: 3,
  circuitResetMs: 5000,
  sleep: () => Promise.resolve(),
};

describe("CircuitBreaker", () => {
  it("opens after threshold consecutive failures", () => {
    let t = 0;
    const b = new CircuitBreaker("x", { ...opts, now: () => t });
    b.recordFailure();
    b.recordFailure();
    expect(b.isOpen).toBe(false);
    b.recordFailure();
    expect(b.isOpen).toBe(true);
  });

  it("half-opens after the reset window", () => {
    let t = 0;
    const b = new CircuitBreaker("x", { ...opts, now: () => t });
    b.recordFailure();
    b.recordFailure();
    b.recordFailure();
    expect(b.isOpen).toBe(true);
    t = 6000;
    expect(b.isOpen).toBe(false);
  });

  it("a success resets the failure count", () => {
    const b = new CircuitBreaker("x", opts);
    b.recordFailure();
    b.recordFailure();
    b.recordSuccess();
    b.recordFailure();
    expect(b.isOpen).toBe(false);
  });
});

describe("resilientFetch", () => {
  it("retries on 5xx then throws SidecarError with upstream body", async () => {
    const fetchMock = vi.fn(async () => new Response("boom", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const b = new CircuitBreaker("v", opts);
    await expect(resilientFetch("v", b, "http://x", { method: "GET" }, opts)).rejects.toBeInstanceOf(SidecarError);
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries
    vi.unstubAllGlobals();
  });

  it("does not retry on 4xx", async () => {
    const fetchMock = vi.fn(async () => new Response("bad", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);
    const b = new CircuitBreaker("v", opts);
    await expect(resilientFetch("v", b, "http://x", { method: "GET" }, opts)).rejects.toBeInstanceOf(SidecarError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("throws CircuitOpenError when the breaker is open", async () => {
    const b = new CircuitBreaker("v", opts);
    b.recordFailure();
    b.recordFailure();
    b.recordFailure();
    await expect(resilientFetch("v", b, "http://x", { method: "GET" }, opts)).rejects.toBeInstanceOf(CircuitOpenError);
  });

  it("returns the response on success", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const b = new CircuitBreaker("v", opts);
    const res = await resilientFetch("v", b, "http://x", { method: "GET" }, opts);
    expect(res.status).toBe(200);
    vi.unstubAllGlobals();
  });
});
