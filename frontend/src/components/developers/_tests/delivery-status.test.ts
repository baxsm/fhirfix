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

// a 2xx is the expected outcome of an api call, so it carries no colour at all.
// colouring every success is what buried the one 500 in a wall of green.
describe("statusTone", () => {
  it("leaves a 2xx neutral", () => {
    const tone = statusTone(200);
    expect(tone).toContain("muted-foreground");
    expect(tone).not.toContain("primary");
    expect(tone).not.toContain("destructive");
  });

  it("marks a 3xx as info", () => {
    expect(statusTone(302)).toContain("info");
  });

  it("marks a 4xx as a warning", () => {
    expect(statusTone(409)).toContain("warning");
  });

  it("marks a 5xx as destructive", () => {
    expect(statusTone(503)).toContain("destructive");
  });

  it("uses semantic tokens, never raw palette shades", () => {
    // -400/-500 shades are dark-theme values that wash out on white, and they
    // bypass the token system entirely.
    for (const code of [200, 302, 409, 503]) {
      expect(statusTone(code)).not.toMatch(/(emerald|sky|amber|red)-\d/);
    }
  });
});
