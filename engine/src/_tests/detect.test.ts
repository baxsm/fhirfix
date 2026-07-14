import { describe, expect, it } from "vitest";
import { detectInput } from "../detect";

describe("detectInput", () => {
  it("detects hl7v2 from MSH and reads version", () => {
    const msg = "MSH|^~\\&|APP|FAC|R|F|20200508||ADT^A01|1|T|2.5.1\rPID|1||x";
    const r = detectInput(msg);
    expect(r.inputType).toBe("hl7v2");
    expect(r.fhirVersion).toBe("R4");
    expect(r.v2Version).toBe("2.5.1");
  });

  it("detects a single fhir json resource", () => {
    const r = detectInput(JSON.stringify({ resourceType: "Patient", id: "x" }));
    expect(r.inputType).toBe("fhir_json");
    expect(r.parsed).toBeDefined();
  });

  it("detects a bundle", () => {
    const r = detectInput(JSON.stringify({ resourceType: "Bundle", entry: [] }));
    expect(r.inputType).toBe("bundle");
  });

  it("detects fhir xml", () => {
    const r = detectInput('<?xml version="1.0"?><Patient xmlns="http://hl7.org/fhir"/>');
    expect(r.inputType).toBe("fhir_xml");
  });

  it("detects r5 from an r5-only resource type", () => {
    const r = detectInput(JSON.stringify({ resourceType: "SubscriptionTopic" }));
    expect(r.fhirVersion).toBe("R5");
  });

  it("detects ndjson", () => {
    const nd = `${JSON.stringify({ resourceType: "Patient" })}\n${JSON.stringify({ resourceType: "Observation" })}`;
    expect(detectInput(nd).inputType).toBe("ndjson");
  });
});
