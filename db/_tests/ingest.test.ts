import { describe, expect, it } from "bun:test";
import { containsPhi, redactPhi } from "../phi";

// the policy decision only; storeRunInput's wiring is covered by the api-v1 integration tests

const patient = {
  resourceType: "Patient",
  identifier: [{ system: "urn:mrn", value: "MRN-12345" }],
  name: [{ family: "Rivera", given: ["Ana"] }],
  birthDate: "1984-02-11",
  gender: "female",
};

const bundle = {
  resourceType: "Bundle",
  type: "collection",
  entry: [{ resource: patient }, { resource: { resourceType: "Observation", status: "final" } }],
};

describe("redaction policy inputs", () => {
  it("detects phi in a bare resource", () => {
    expect(containsPhi(patient)).toBe(true);
  });

  it("detects phi nested inside a bundle entry", () => {
    expect(containsPhi(bundle)).toBe(true);
  });

  it("reports no phi once redacted, so a stored copy is not flagged", () => {
    expect(containsPhi(redactPhi(patient))).toBe(false);
    expect(containsPhi(redactPhi(bundle))).toBe(false);
  });

  it("leaves non-phi clinical fields intact", () => {
    const out = redactPhi(patient) as typeof patient;
    expect(out.gender).toBe("female");
    expect(out.resourceType).toBe("Patient");
  });

  it("keeps identifier.system so a mapping fix can still be derived", () => {
    const out = redactPhi(patient) as typeof patient;
    expect(out.identifier[0]?.system).toBe("urn:mrn");
    expect(out.identifier[0]?.value).not.toBe("MRN-12345");
  });

  it("does not mutate the caller's object", () => {
    redactPhi(patient);
    expect(patient.name[0]?.family).toBe("Rivera");
  });

  it("treats a resource with no phi fields as clean", () => {
    expect(containsPhi({ resourceType: "Observation", status: "final" })).toBe(false);
  });
});
