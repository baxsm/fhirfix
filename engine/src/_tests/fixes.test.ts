import { describe, expect, it } from "vitest";
import { deriveFix, type FixContext } from "../fixes";
import type { EngineFinding, RegistryMapping } from "../types";

function finding(fhirpath: string, over: Partial<EngineFinding> = {}): EngineFinding {
  return {
    severity: "error",
    category: "structural",
    ruleSource: "r",
    specCitation: "r",
    fhirpath,
    rawValidatorMessage: "",
    plainMessage: "",
    suggestedFix: "",
    fixConfidence: "manual",
    fixStatus: "manual_needed",
    dedupFingerprint: "fp",
    occurrenceCount: 1,
    rank: 0,
    ...over,
  };
}

function ctx(mappings: RegistryMapping[] = []): FixContext {
  return { mappings, suggestions: [] };
}

describe("deriveIdentifierTypeSystem", () => {
  it("adds v2-0203 system and normalizes MRN -> MR (safe, auto)", () => {
    const res = { resourceType: "Patient", identifier: [{ type: { coding: [{ code: "MRN", display: "MRN" }] }, value: "1" }] };
    const fix = deriveFix(res, finding("Patient.identifier[0].type.coding[0]"), ctx());
    expect(fix?.safe).toBe(true);
    expect(fix?.confidence).toBe("auto");
    fix?.apply(res);
    const coding = res.identifier[0]?.type.coding[0] as { system?: string; code?: string };
    expect(coding.system).toBe("http://terminology.hl7.org/CodeSystem/v2-0203");
    expect(coding.code).toBe("MR");
  });
});

describe("deriveIdentifierSystem", () => {
  const mapping: RegistryMapping = {
    type: "authority_to_system",
    sourceValue: "SIMULATOR-MRN",
    targetValue: "http://hospital.example.org/mrn",
    targetSystem: null,
    status: "active",
  };

  it("replaces a placeholder system via the registry (safe, auto)", () => {
    const res = {
      resourceType: "Patient",
      identifier: [{ system: "http://example.com/v2-to-fhir-converter/Identifier/SIMULATOR-MRN", value: "1" }],
    };
    const fix = deriveFix(res, finding("Patient.identifier[0].system"), ctx([mapping]));
    expect(fix?.safe).toBe(true);
    fix?.apply(res);
    expect(res.identifier[0]?.system).toBe("http://hospital.example.org/mrn");
  });

  it("emits a suggestion and an unsafe one-click finding when unmapped", () => {
    const res = {
      resourceType: "Patient",
      identifier: [{ system: "http://example.com/v2-to-fhir-converter/Identifier/UNKNOWN-AUTH", value: "1" }],
    };
    const c = ctx([]);
    const fix = deriveFix(res, finding("Patient.identifier[0].system"), c);
    expect(fix?.safe).toBe(false);
    expect(fix?.confidence).toBe("one_click");
    expect(c.suggestions).toHaveLength(1);
    expect(c.suggestions[0]?.sourceValue).toBe("UNKNOWN-AUTH");
  });
});

describe("deriveDateReformat", () => {
  it("reformats YYYYMMDD birthDate to ISO (safe, auto)", () => {
    const res = { resourceType: "Patient", birthDate: "19870112" };
    const fix = deriveFix(res, finding("Patient.birthDate"), ctx());
    expect(fix?.after).toBe("1987-01-12");
    fix?.apply(res);
    expect(res.birthDate).toBe("1987-01-12");
  });
});

describe("deriveGender", () => {
  it("maps HL7 code F -> female via Table 0001 (safe, auto)", () => {
    const res = { resourceType: "Patient", gender: "F" };
    const fix = deriveFix(res, finding("Patient.gender"), ctx());
    expect(fix?.after).toBe("female");
    fix?.apply(res);
    expect(res.gender).toBe("female");
  });

  it("does not fire on an already-valid gender", () => {
    const res = { resourceType: "Patient", gender: "female" };
    const fix = deriveFix(res, finding("Patient.gender"), ctx());
    expect(fix).toBeUndefined();
  });
});
