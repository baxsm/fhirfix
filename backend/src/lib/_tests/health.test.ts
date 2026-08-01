import { describe, expect, test } from "bun:test";
import { poolStatus, worst } from "@/lib/health";

describe("worst", () => {
  test("all passing is pass", () => {
    expect(worst(["pass", "pass", "pass"])).toBe("pass");
  });

  test("one failure outranks everything", () => {
    expect(worst(["pass", "warn", "fail"])).toBe("fail");
  });

  test("a warning does not become a failure", () => {
    // the distinction that keeps a degraded-but-serving system off the pager
    expect(worst(["pass", "warn"])).toBe("warn");
  });

  test("no checks is pass, not a silent failure", () => {
    expect(worst([])).toBe("pass");
  });
});

describe("poolStatus", () => {
  test("every instance ready is pass", () => {
    expect(poolStatus(4, 4)).toBe("pass");
  });

  test("some instances ready is warn, because runs still complete", () => {
    expect(poolStatus(1, 4)).toBe("warn");
  });

  test("no instances ready is fail", () => {
    expect(poolStatus(0, 4)).toBe("fail");
  });

  test("a single-instance pool has no degraded state", () => {
    expect(poolStatus(1, 1)).toBe("pass");
    expect(poolStatus(0, 1)).toBe("fail");
  });
});
