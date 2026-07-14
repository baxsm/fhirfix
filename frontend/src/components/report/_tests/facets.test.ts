import { describe, expect, it } from "vitest";
import { applyPreset, filterFindings } from "../facet-sidebar";
import type { FindingRow } from "../report-types";

function mk(overrides: Partial<FindingRow>): FindingRow {
  return {
    id: Math.random().toString(36),
    severity: "warning",
    category: "structural",
    ruleSource: "r",
    specCitation: "s",
    resourceType: "Patient",
    fhirpath: "Patient.x",
    rawValidatorMessage: "raw",
    plainMessage: "msg",
    suggestedFix: "fix",
    fixConfidence: "auto",
    fixStatus: "suggested",
    dedupFingerprint: "fp",
    occurrenceCount: 1,
    rank: 100,
    ...overrides,
  };
}

const findings: FindingRow[] = [
  mk({ severity: "error", fixStatus: "suggested" }),
  mk({ severity: "warning", fixStatus: "applied" }),
  mk({ severity: "warning", fixStatus: "manual_needed" }),
  mk({ severity: "info", fixStatus: "dismissed" }),
];

describe("filterFindings", () => {
  it("hides dismissed by default", () => {
    const shown = filterFindings(findings, applyPreset("all"), "all");
    expect(shown.some((f) => f.fixStatus === "dismissed")).toBe(false);
    expect(shown).toHaveLength(3);
  });

  it("auto-fixable preset keeps only suggested, un-applied findings", () => {
    const shown = filterFindings(findings, applyPreset("auto-fixable"), "auto-fixable");
    expect(shown).toHaveLength(1);
    expect(shown[0]?.severity).toBe("error");
    expect(shown[0]?.fixStatus).toBe("suggested");
  });

  it("critical-only preset keeps only errors", () => {
    const shown = filterFindings(findings, applyPreset("critical"), "critical");
    expect(shown.every((f) => f.severity === "error")).toBe(true);
    expect(shown).toHaveLength(1);
  });

  it("needs-review preset drops safely-fixable findings", () => {
    const shown = filterFindings(findings, applyPreset("needs-review"), "needs-review");
    // suggested (auto-fixable) findings are excluded; manual_needed stays.
    expect(shown.some((f) => f.fixStatus === "suggested")).toBe(false);
    expect(shown.some((f) => f.fixStatus === "manual_needed")).toBe(true);
  });

  it("severity facet filters to the selected severities", () => {
    const facets = { ...applyPreset("all"), severities: new Set(["warning" as const]) };
    const shown = filterFindings(findings, facets, "all");
    expect(shown.every((f) => f.severity === "warning")).toBe(true);
  });
});
