import { describe, expect, test } from "bun:test";
import type { Finding, Severity } from "fhirfix";
import { summarize, tripsGate } from "../gate.js";


function finding(severity: Severity, message = "problem"): Finding {
  return {
    severity,
    category: "structural",
    resourceType: "Patient",
    fhirpath: "Patient.gender",
    ruleSource: "hapi",
    specCitation: "http://hl7.org/fhir/valueset-administrative-gender.html",
    plainMessage: message,
    suggestedFix: "set gender to a valid code",
    fixConfidence: "auto",
    fixStatus: "suggested",
    occurrenceCount: 1,
  };
}

function appliedFinding(): Finding {
  return { ...finding("error"), fixStatus: "applied" };
}

describe("tripsGate", () => {
  test("an applied finding never trips the gate", () => {
    expect(tripsGate(appliedFinding(), "error")).toBe(false);
    expect(tripsGate(appliedFinding(), "warning")).toBe(false);
    expect(tripsGate(appliedFinding(), "info")).toBe(false);
  });

  test("fix passes when every finding was applied", () => {
    const summary = summarize([appliedFinding(), appliedFinding()], "error");
    expect(summary.passed).toBe(true);
    expect(summary.errors).toBe(0);
    expect(summary.applied).toBe(2);
    expect(summary.blocking).toHaveLength(0);
  });

  test("an unfixed error still trips the gate next to an applied one", () => {
    const summary = summarize([appliedFinding(), finding("error")], "error");
    expect(summary.passed).toBe(false);
    expect(summary.errors).toBe(1);
    expect(summary.applied).toBe(1);
  });

  test("--fail-on error only trips on errors", () => {
    expect(tripsGate(finding("error"), "error")).toBe(true);
    expect(tripsGate(finding("warning"), "error")).toBe(false);
    expect(tripsGate(finding("info"), "error")).toBe(false);
  });

  test("--fail-on warning trips on errors and warnings", () => {
    expect(tripsGate(finding("error"), "warning")).toBe(true);
    expect(tripsGate(finding("warning"), "warning")).toBe(true);
    expect(tripsGate(finding("info"), "warning")).toBe(false);
  });

  test("--fail-on info trips on everything", () => {
    expect(tripsGate(finding("error"), "info")).toBe(true);
    expect(tripsGate(finding("warning"), "info")).toBe(true);
    expect(tripsGate(finding("info"), "info")).toBe(true);
  });
});

describe("summarize", () => {
  test("counts each severity independently of the threshold", () => {
    const summary = summarize(
      [finding("error"), finding("error"), finding("warning"), finding("info")],
      "error",
    );
    expect(summary.total).toBe(4);
    expect(summary.errors).toBe(2);
    expect(summary.warnings).toBe(1);
    expect(summary.infos).toBe(1);
  });

  test("passes when nothing meets the threshold", () => {
    const summary = summarize([finding("warning"), finding("info")], "error");
    expect(summary.passed).toBe(true);
    expect(summary.blocking).toHaveLength(0);
  });

  test("fails and lists only the blocking findings", () => {
    const summary = summarize([finding("error"), finding("warning"), finding("info")], "warning");
    expect(summary.passed).toBe(false);
    expect(summary.blocking).toHaveLength(2);
    expect(summary.blocking.every((f) => f.severity !== "info")).toBe(true);
  });

  test("a clean file passes", () => {
    const summary = summarize([], "info");
    expect(summary.passed).toBe(true);
    expect(summary.total).toBe(0);
  });

  test("info findings alone never fail the default gate", () => {
    // the common real case: advisory findings should not break someone's build.
    const summary = summarize([finding("info"), finding("info")], "error");
    expect(summary.passed).toBe(true);
  });
});
