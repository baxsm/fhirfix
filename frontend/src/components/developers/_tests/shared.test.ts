import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { timeAgo } from "../shared";

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("returns Never for null", () => {
    expect(timeAgo(null)).toBe("Never");
  });

  it("returns Just now under a minute", () => {
    expect(timeAgo(new Date("2026-07-15T11:59:30Z"))).toBe("Just now");
  });

  it("returns minutes for under an hour", () => {
    expect(timeAgo(new Date("2026-07-15T11:25:00Z"))).toBe("35m ago");
  });

  it("returns hours for under a day", () => {
    expect(timeAgo(new Date("2026-07-15T09:00:00Z"))).toBe("3h ago");
  });

  it("returns days for under a month", () => {
    expect(timeAgo(new Date("2026-07-10T12:00:00Z"))).toBe("5d ago");
  });
});
