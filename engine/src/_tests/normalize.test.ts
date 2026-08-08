import { describe, expect, it } from "vitest";
import { normalizeOutcome } from "../normalize";
import type { OperationOutcome } from "../types";

const MIN_MSG = (element: string) =>
  `${element}: minimum required = 1, but only found 0 (from http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient|6.1.0)`;

const cardinalityIssue = (element: string) => ({
  severity: "error" as const,
  code: "structure",
  details: { text: MIN_MSG(element) },
  expression: ["Patient"],
  extension: [
    {
      url: "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
      valueCode: "Validation_VAL_Profile_Minimum",
    },
  ],
});

describe("normalizeOutcome cardinality paths", () => {
  it("names the missing element, not the resource that holds it", () => {
    const oo: OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [cardinalityIssue("Patient.identifier")],
    };
    const finding = normalizeOutcome(oo)[0];
    expect(finding?.fhirpath).toBe("Patient.identifier");
    expect(finding?.plainMessage).toContain("Patient.identifier is required");
    // the bug this locks out: telling the reader to add a Patient they already have
    expect(finding?.plainMessage).not.toBe(
      "Patient is required by the profile but missing. Provide a value.",
    );
  });

  it("keeps two missing elements on one resource as separate findings", () => {
    const oo: OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [cardinalityIssue("Patient.identifier"), cardinalityIssue("Patient.name")],
    };
    const findings = normalizeOutcome(oo);
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.fhirpath).sort()).toEqual(["Patient.identifier", "Patient.name"]);
    expect(findings.every((f) => f.occurrenceCount === 1)).toBe(true);
  });

  it("still collapses the same missing element repeated", () => {
    const oo: OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [cardinalityIssue("Patient.identifier"), cardinalityIssue("Patient.identifier")],
    };
    const findings = normalizeOutcome(oo);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.occurrenceCount).toBe(2);
  });

  it("reports the real minimum when the profile wants more than one", () => {
    const oo: OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "structure",
          details: { text: "Patient.name: minimum required = 2, but only found 0" },
          expression: ["Patient"],
        },
      ],
    };
    expect(normalizeOutcome(oo)[0]?.plainMessage).toContain("at least 2 values");
  });

  it("leaves a genuine resource-level finding pointed at the resource", () => {
    // dom-6 really is about the Patient itself, so the message must not be rewritten.
    const oo: OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "warning",
          code: "invariant",
          details: { text: "Constraint failed: dom-6: 'A resource should have narrative'" },
          expression: ["Patient"],
        },
      ],
    };
    expect(normalizeOutcome(oo)[0]?.fhirpath).toBe("Patient");
  });

  it("ignores a message naming a different resource than the validator pointed at", () => {
    const oo: OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: "structure",
          details: { text: "Observation.value: minimum required = 1, but only found 0" },
          expression: ["Patient"],
        },
      ],
    };
    // the message disagrees with expression[0]; trust the validator's own pointer.
    expect(normalizeOutcome(oo)[0]?.fhirpath).toBe("Patient");
  });
});

describe("normalizeOutcome rule vs spec", () => {
  const issueWith = (extension: { url: string; valueCode?: string; valueString?: string }[]) => ({
    resourceType: "OperationOutcome" as const,
    issue: [
      {
        severity: "error" as const,
        code: "structure",
        details: { text: "Organization.active: minimum required = 1, but only found 0" },
        expression: ["Organization"],
        extension,
      },
    ],
  });

  it("reports the rule id and the source engine separately", () => {
    const finding = normalizeOutcome(
      issueWith([
        {
          url: "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id",
          valueCode: "Validation_VAL_Profile_Minimum",
        },
        {
          url: "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-source",
          valueString: "InstanceValidator",
        },
      ]),
    )[0];
    expect(finding?.ruleSource).toBe("Validation_VAL_Profile_Minimum");
    expect(finding?.specCitation).toBe("InstanceValidator");
  });

  it("never repeats the rule id as the spec citation", () => {
    // both rows render in the ui; the same string twice states one fact as two
    const onlySource = normalizeOutcome(
      issueWith([
        {
          url: "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-source",
          valueString: "TerminologyEngine",
        },
      ]),
    )[0];
    expect(onlySource?.ruleSource).toBe("TerminologyEngine");
    expect(onlySource?.specCitation).not.toBe(onlySource?.ruleSource);
  });

  it("falls back to the base spec when the validator sends no extensions", () => {
    const finding = normalizeOutcome(issueWith([]))[0];
    expect(finding?.ruleSource).toBe("FHIR R4 base");
    expect(finding?.specCitation).toBe("FHIR R4 base");
  });
});
