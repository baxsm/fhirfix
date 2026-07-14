import { describe, expect, it } from "vitest";
import { fingerprint, stripIndices } from "../fingerprint";
import { normalizeOutcome, rankScore } from "../normalize";
import type { OperationOutcome } from "../types";

describe("fingerprint", () => {
  it("strips array indices so the same defect class collapses", () => {
    expect(stripIndices("Patient.identifier[0].system")).toBe("Patient.identifier.system");
    expect(stripIndices("Patient.identifier[3].system")).toBe("Patient.identifier.system");
  });

  it("gives identical fingerprints for the same defect at different indices", () => {
    const a = fingerprint({ ruleSource: "r", category: "structural", resourceType: "Patient", fhirpath: "Patient.identifier[0].system" });
    const b = fingerprint({ ruleSource: "r", category: "structural", resourceType: "Patient", fhirpath: "Patient.identifier[9].system" });
    expect(a).toBe(b);
  });

  it("gives different fingerprints for different rules", () => {
    const a = fingerprint({ ruleSource: "r1", category: "structural" });
    const b = fingerprint({ ruleSource: "r2", category: "structural" });
    expect(a).not.toBe(b);
  });
});

describe("normalizeOutcome dedup + ranking", () => {
  it("collapses N identical defects into one finding with a count", () => {
    const issue = (idx: number) => ({
      severity: "error" as const,
      code: "invalid",
      details: { text: "Coding has no system" },
      expression: [`Patient.identifier[${idx}].type.coding[0]`],
    });
    const oo: OperationOutcome = { resourceType: "OperationOutcome", issue: [issue(0), issue(1), issue(2)] };
    const findings = normalizeOutcome(oo);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.occurrenceCount).toBe(3);
  });

  it("ranks errors above warnings", () => {
    const oo: OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [
        { severity: "warning", code: "invariant", details: { text: "dom-6" }, expression: ["Patient"] },
        { severity: "error", code: "code-invalid", details: { text: "bad code" }, expression: ["Patient.gender"] },
      ],
    };
    const findings = normalizeOutcome(oo);
    expect(findings[0]?.severity).toBe("error");
  });

  it("rankScore weights severity, fixability, occurrence", () => {
    expect(rankScore("error", "auto", 1)).toBeGreaterThan(rankScore("warning", "auto", 1));
    expect(rankScore("error", "auto", 1)).toBeGreaterThan(rankScore("error", "manual", 1));
    expect(rankScore("error", "auto", 10)).toBeGreaterThan(rankScore("error", "auto", 1));
  });
});
