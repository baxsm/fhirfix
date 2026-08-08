import { describe, expect, it } from "bun:test";
import { type ReportBundle, toJsonReport, toOperationOutcome, toPdfReport } from "../report-export";

const bundle: ReportBundle = {
  run: {
    id: "run_test",
    inputType: "fhir_json",
    status: "completed",
    conformanceScoreBefore: 880,
    conformanceScoreAfter: 970,
    findingsTotal: 3,
    findingsAutoFixable: 2,
    resourceCount: 1,
    engineVersion: "0.2.0",
    createdAt: new Date("2026-07-14T00:00:00Z"),
    completedAt: new Date("2026-07-14T00:00:05Z"),
    // biome-ignore lint/suspicious/noExplicitAny: partial run fixture
  } as any,
  findings: [
    {
      id: "fnd_1",
      severity: "warning",
      category: "terminology",
      fhirpath: "Patient.identifier[0].type.coding[0]",
      resourceType: "Patient",
      plainMessage: "A code with no system.",
      suggestedFix: "Set the v2-0203 system.",
      fixStatus: "applied",
      fixConfidence: "auto",
      occurrenceCount: 1,
      ruleSource: "Terminology_TX_System_Relative",
      specCitation: "us-core-patient",
      rawValidatorMessage: "raw",
      dedupFingerprint: "fp1",
      rank: 210,
      // biome-ignore lint/suspicious/noExplicitAny: partial finding fixture
    } as any,
  ],
  profilesApplied: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
};

describe("toJsonReport", () => {
  it("produces a stable structured report", () => {
    const json = JSON.parse(toJsonReport(bundle));
    expect(json.report).toBe("fhirfix.remediation");
    expect(json.run.conformanceScore).toEqual({ before: 880, after: 970 });
    expect(json.findings).toHaveLength(1);
    expect(json.findings[0].message).toBe("A code with no system.");
  });
});

describe("toOperationOutcome", () => {
  it("produces a valid FHIR OperationOutcome with one issue per finding", () => {
    const oo = JSON.parse(toOperationOutcome(bundle));
    expect(oo.resourceType).toBe("OperationOutcome");
    expect(oo.issue).toHaveLength(1);
    expect(oo.issue[0].severity).toBe("warning");
    expect(oo.issue[0].expression).toEqual(["Patient.identifier[0].type.coding[0]"]);
  });

  it("maps info severity to 'information'", () => {
    const infoBundle: ReportBundle = {
      ...bundle,
      // biome-ignore lint/suspicious/noExplicitAny: partial finding fixture
      findings: [{ ...bundle.findings[0], severity: "info" } as any],
    };
    const oo = JSON.parse(toOperationOutcome(infoBundle));
    expect(oo.issue[0].severity).toBe("information");
  });
});

describe("toPdfReport", () => {
  it("produces a genuinely valid PDF (header + EOF + xref)", () => {
    const bytes = toPdfReport(bundle);
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith("%PDF-1.")).toBe(true);
    expect(text.includes("%%EOF")).toBe(true);
    expect(text.includes("xref")).toBe(true);
    expect(text.includes("/Type /Catalog")).toBe(true);
    // the score line made it into the content stream.
    expect(text.includes("880")).toBe(true);
  });

  it("escapes parens in finding text so the stream stays valid", () => {
    const parenBundle: ReportBundle = {
      ...bundle,
      findings: [
        // biome-ignore lint/suspicious/noExplicitAny: partial finding fixture
        { ...bundle.findings[0], plainMessage: "Has (parens) inside" } as any,
      ],
    };
    const text = new TextDecoder().decode(toPdfReport(parenBundle));
    expect(text.includes("\\(parens\\)")).toBe(true);
  });
});
