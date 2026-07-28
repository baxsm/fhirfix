import { describe, expect, it } from "bun:test";
import { containsPhi, redactPhi } from "../phi";

const patient = {
  resourceType: "Patient",
  identifier: [{ system: "http://x/mrn", value: "10009" }],
  name: [{ family: "Esterkin", given: ["AKI"] }],
  telecom: [{ system: "phone", value: "020 3614 5541" }],
  gender: "female",
};

const bundle = {
  resourceType: "Bundle",
  entry: [{ resource: patient }, { resource: { resourceType: "Organization", name: "Northwind" } }],
};

describe("containsPhi", () => {
  it("flags a Patient with name/identifier value", () => {
    expect(containsPhi(patient)).toBe(true);
  });

  it("flags a bundle that contains a Patient", () => {
    expect(containsPhi(bundle)).toBe(true);
  });

  it("does not flag a resource with only codes and systems", () => {
    const clean = {
      resourceType: "Observation",
      code: { coding: [{ system: "http://loinc.org", code: "1234-5" }] },
      status: "final",
    };
    expect(containsPhi(clean)).toBe(false);
  });
});

describe("redactPhi", () => {
  it("scrubs names, telecom, and identifier values but keeps structure", () => {
    const redacted = redactPhi(patient) as typeof patient;
    expect(redacted.name).toBe("[redacted]" as never);
    expect(redacted.telecom).toBe("[redacted]" as never);
    expect(redacted.identifier[0]?.value).toBe("[redacted]");
    // the system survives (it is conformance-relevant, not PHI).
    expect(redacted.identifier[0]?.system).toBe("http://x/mrn");
    // codes survive.
    expect(redacted.gender).toBe("female");
  });

  it("leaves the original untouched", () => {
    redactPhi(patient);
    expect(patient.name[0]?.family).toBe("Esterkin");
  });

  it("redacted output no longer contains PHI", () => {
    const redacted = redactPhi(bundle);
    expect(containsPhi(redacted)).toBe(false);
  });
});
