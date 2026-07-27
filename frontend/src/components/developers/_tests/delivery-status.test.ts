import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-query", () => ({ useMutation: () => ({}), useQuery: () => ({}) }));
vi.mock("@/trpc/client", () => ({ useTRPC: () => ({}) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { statusTone } from "../request-logs-section";
import { isDeliveryOk } from "../webhooks-section";

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
    for (const code of [200, 302, 409, 503]) {
      expect(statusTone(code)).not.toMatch(/(emerald|sky|amber|red)-\d/);
    }
  });
});
