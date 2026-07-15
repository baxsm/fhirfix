import { describe, expect, it, vi } from "vitest";

// these modules import tRPC + sonner at module load, so stub the boundaries
// before importing the helper under test.
vi.mock("@tanstack/react-query", () => ({ useMutation: () => ({}), useQuery: () => ({}) }));
vi.mock("@/trpc/client", () => ({ useTRPC: () => ({}) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { statusTone } from "../request-logs-section";
import { isDeliveryOk } from "../webhooks-section";

// regression: a 503 delivery ("HTTP 503") once rendered as success because the
// frontend assumed the enum values "success"/"failed". the worker actually writes
// "<code> ok" on success and an error string otherwise.
describe("isDeliveryOk", () => {
  it("treats a '200 ok' status as success", () => {
    expect(isDeliveryOk("200 ok")).toBe(true);
  });

  it("treats an 'HTTP 503' status as failure", () => {
    expect(isDeliveryOk("HTTP 503")).toBe(false);
  });

  it("treats a network error string as failure", () => {
    expect(isDeliveryOk("secret decrypt failed")).toBe(false);
  });

  it("treats null as failure", () => {
    expect(isDeliveryOk(null)).toBe(false);
  });
});

describe("statusTone", () => {
  it("greens a 2xx", () => {
    expect(statusTone(200)).toContain("emerald");
  });

  it("blues a 3xx", () => {
    expect(statusTone(302)).toContain("sky");
  });

  it("ambers a 4xx", () => {
    expect(statusTone(409)).toContain("amber");
  });

  it("reds a 5xx", () => {
    expect(statusTone(503)).toContain("red");
  });
});
