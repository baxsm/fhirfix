import { describe, expect, it } from "vitest";
import { isCancelled, isRealFailure } from "../run-status";

// `run.cancel` writes status "failed" with "Cancelled by user.", so the list
// cannot tell the two apart from `status` alone. these pin the split that the
// row tint, the status cell, the Failed-only filter and its count all read.
describe("run status split", () => {
  const cancelled = { status: "failed" as const, errorMessage: "Cancelled by user." };
  const broke = {
    status: "failed" as const,
    errorMessage: "validator.validate: validator.validate unreachable: Error: Unable to connect.",
  };
  const badFile = {
    status: "failed" as const,
    errorMessage: 'JSON Parse error: Unexpected identifier "this"',
  };
  const ok = { status: "completed" as const, errorMessage: null };

  it("reads a cancel as cancelled, not failed", () => {
    expect(isCancelled(cancelled)).toBe(true);
    expect(isRealFailure(cancelled)).toBe(false);
  });

  it("counts a sidecar outage as a real failure", () => {
    expect(isRealFailure(broke)).toBe(true);
    expect(isCancelled(broke)).toBe(false);
  });

  it("counts a bad file as a real failure", () => {
    expect(isRealFailure(badFile)).toBe(true);
  });

  it("never marks a non-failed run as either", () => {
    expect(isCancelled(ok)).toBe(false);
    expect(isRealFailure(ok)).toBe(false);
  });

  it("treats a failure with no message as real, not cancelled", () => {
    const bare = { status: "failed" as const, errorMessage: null };
    expect(isRealFailure(bare)).toBe(true);
    expect(isCancelled(bare)).toBe(false);
  });

  it("filters a mixed list to real failures only", () => {
    const all = [cancelled, broke, badFile, ok];
    expect(all.filter(isRealFailure)).toHaveLength(2);
  });
});
