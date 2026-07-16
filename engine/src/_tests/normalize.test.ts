import { describe, expect, it } from "vitest";
import { normalizeOutcome } from "../normalize";
import type { OperationOutcome } from "../types";

// the exact message text the live HAPI validator emits for a us-core-patient with
// no identifier and no name. captured from the real sidecar, not written by hand:
// HAPI blames the PARENT element, so expression is ["Patient"] on both, and the
// element actually missing appears only in details.text.
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
    // same expression + same message id: these collapsed into one finding before,
    // so a developer never learned name was missing.
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
