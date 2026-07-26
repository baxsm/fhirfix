import { describe, expect, it } from "vitest";
import { describeFailure } from "../run-failure";

describe("describeFailure", () => {
  // the two strings below are copied verbatim out of the runs table, not
  // invented. if the worker changes how it builds `detail`, these break.
  it("reads a real json parse failure", () => {
    const f = describeFailure('JSON Parse error: Unexpected identifier "this"');
    expect(f.kind).toBe("input");
    expect(f.title).toBe("This file is not valid JSON");
    expect(f.cause).toContain('"this"');
  });

  it("reads a real sidecar failure", () => {
    const f = describeFailure(
      "validator.validate: validator.validate unreachable: Error: Unable to connect. Is the computer able to access the url?",
    );
    expect(f.kind).toBe("service");
    expect(f.retryable).toBe(true);
  });

  it("does not offer a retry when the file is the problem", () => {
    expect(describeFailure('JSON Parse error: Unexpected identifier "not"').retryable).toBe(false);
  });

  it("treats a cancel as a cancel, not a failure", () => {
    const f = describeFailure("Cancelled by user.");
    expect(f.kind).toBe("cancelled");
    expect(f.title).toBe("Check cancelled");
    expect(f.next).toBeNull();
  });

  it("separates an open circuit from a plain outage", () => {
    const f = describeFailure("validator circuit is open (too many recent failures)");
    expect(f.kind).toBe("service");
    expect(f.title).toBe("Checks are paused");
  });

  it("handles a missing message without inventing a cause", () => {
    expect(describeFailure(null).kind).toBe("unknown");
    expect(describeFailure("   ").kind).toBe("unknown");
  });

  it("falls back rather than mislabelling an unknown error", () => {
    const f = describeFailure("Error: something nobody predicted");
    expect(f.kind).toBe("unknown");
    expect(f.title).toBe("Check failed");
  });

  it("never returns an empty cause", () => {
    const inputs = [
      null,
      "",
      "Cancelled by user.",
      'JSON Parse error: Unexpected identifier "this"',
      "validator unreachable",
      "could not read input blob: NoSuchKey",
      "weird",
    ];
    for (const i of inputs) {
      expect(describeFailure(i).cause.length).toBeGreaterThan(0);
    }
  });
});
