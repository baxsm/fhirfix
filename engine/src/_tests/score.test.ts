import { describe, expect, it } from "vitest";
import { scoreFrom } from "../remediate";
import type { EngineFinding } from "../types";

function findings(count: number, severity: EngineFinding["severity"]): EngineFinding[] {
  return Array.from({ length: count }, (_, i) => ({
    severity,
    category: "structural",
    ruleSource: `rule-${i}`,
    specCitation: `rule-${i}`,
    resourceType: "Patient",
    fhirpath: `Patient.field${i}`,
    rawValidatorMessage: "raw",
    plainMessage: "plain",
    suggestedFix: "",
    fixConfidence: "manual",
    fixStatus: "manual_needed",
    dedupFingerprint: `fp-${i}`,
    occurrenceCount: 1,
    rank: 0,
  }));
}

describe("scoreFrom", () => {
  it("scores a clean resource 1000", () => {
    expect(scoreFrom([], 1)).toBe(1000);
  });

  it("penalises errors more than warnings", () => {
    expect(scoreFrom(findings(1, "error"), 1)).toBeLessThan(scoreFrom(findings(1, "warning"), 1));
  });

  // the hl7v2 case: one ADT^A01 converts to 14 resources with 27 findings.
  // unscaled this is 1710 penalty against a 1000 budget, so before and after
  // both floor at 0 and the report shows no improvement for real fixes.
  it("does not floor a multi-resource bundle at 0", () => {
    const real = [...findings(10, "error"), ...findings(17, "warning")];
    expect(scoreFrom(real, 14)).toBeGreaterThan(0);
  });

  it("keeps a fixed bundle scoring higher than the broken one", () => {
    const before = [...findings(10, "error"), ...findings(17, "warning")];
    const after = [...findings(8, "error"), ...findings(1, "warning")];
    expect(scoreFrom(after, 14)).toBeGreaterThan(scoreFrom(before, 14));
  });

  it("scales the budget with resource count", () => {
    const f = findings(10, "error");
    expect(scoreFrom(f, 14)).toBeGreaterThan(scoreFrom(f, 1));
  });
});
