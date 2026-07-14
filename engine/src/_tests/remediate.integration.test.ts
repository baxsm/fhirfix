import { beforeAll, describe, expect, it } from "vitest";
import { ConverterClient } from "../converter-client";
import { runRemediation } from "../remediate";
import type { EngineDeps } from "../remediate";
import type { RegistryMapping } from "../types";
import { ValidatorPool } from "../validator-client";

// REAL sidecars. these run against the docker-compose validator + converter.
// no mocks: the spec requires the golden loop to reach 0 errors on the real
// java validator, which jsdom/mocks would hide.

const VALIDATOR_URL = process.env.VALIDATOR_URL ?? "http://localhost:4567";
const CONVERTER_URL = process.env.CONVERTER_URL ?? "http://localhost:8081";

// starter registry: the simulator MRN authority -> a real resolvable system.
const MAPPINGS: RegistryMapping[] = [
  {
    type: "authority_to_system",
    sourceValue: "SIMULATOR-MRN",
    // a non-example system; the validator rejects example.org/example.com URLs.
    targetValue: "http://northwind-health.org/fhir/sid/mrn",
    targetSystem: null,
    status: "active",
  },
];

// the canonical golden case: a naive US Core Patient exactly as the v2 converter
// emits it - placeholder identifier system + type coding with no system.
const NAIVE_PATIENT = {
  resourceType: "Patient",
  id: "golden",
  identifier: [
    {
      type: { coding: [{ code: "MRN", display: "MRN" }] },
      system: "http://example.com/v2-to-fhir-converter/Identifier/SIMULATOR-MRN",
      value: "3735064194",
    },
  ],
  name: [{ family: "Esterkin", given: ["AKI"] }],
  gender: "female",
  birthDate: "1987-01-12",
};

let deps: EngineDeps;

beforeAll(async () => {
  const validator = new ValidatorPool({
    instances: [{ baseUrl: VALIDATOR_URL, maxInFlight: 4 }],
    requiredIgs: [{ id: "hl7.fhir.us.core", version: "6.1.0" }],
  });
  const { readyCount } = await validator.warmup();
  expect(readyCount).toBeGreaterThan(0);
  const converter = new ConverterClient({ baseUrl: CONVERTER_URL });
  expect(await converter.ready()).toBe(true);
  deps = { validator, converter };
}, 240_000);

describe("golden remediation loop (real sidecars)", () => {
  it(
    "naive Patient -> ranked findings -> auto-fixed -> re-verified with fewer errors",
    async () => {
      const result = await runRemediation(
        { raw: JSON.stringify(NAIVE_PATIENT), mappings: MAPPINGS, autoFix: true },
        deps,
      );

      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.autoFixApplied).toBe(true);

      // the identifier system got the registered real system.
      const corrected = result.correctedResource as {
        identifier?: Array<{ system?: string; type?: { coding?: Array<{ system?: string; code?: string }> } }>;
      };
      expect(corrected.identifier?.[0]?.system).toBe("http://northwind-health.org/fhir/sid/mrn");
      // the identifier type coding got the v2-0203 system + normalized code.
      expect(corrected.identifier?.[0]?.type?.coding?.[0]?.system).toBe(
        "http://terminology.hl7.org/CodeSystem/v2-0203",
      );
      expect(corrected.identifier?.[0]?.type?.coding?.[0]?.code).toBe("MR");

      // re-verification improved the conformance score.
      expect(result.conformanceScoreAfter).toBeGreaterThan(result.conformanceScoreBefore);
      // the corrected resource has no remaining errors.
      const remainingErrors = result.findings.filter(
        (f) => f.severity === "error" && f.fixStatus !== "applied",
      );
      expect(remainingErrors).toHaveLength(0);
      expect(result.reVerifiedClean).toBe(true);
    },
    120_000,
  );

  it(
    "terminology validation catches an invalid gender code against a real value set",
    async () => {
      const bad = { ...NAIVE_PATIENT, gender: "X" };
      const result = await runRemediation(
        { raw: JSON.stringify(bad), mappings: MAPPINGS, autoFix: false },
        deps,
      );
      const term = result.findings.find(
        (f) => f.category === "terminology" && f.fhirpath?.includes("gender"),
      );
      expect(term).toBeDefined();
      expect(term?.severity).toBe("error");
    },
    120_000,
  );

  it(
    "an unmapped authority produces an auto-learned mapping suggestion",
    async () => {
      const unmapped = structuredClone(NAIVE_PATIENT);
      const firstId = unmapped.identifier[0];
      if (firstId) {
        firstId.system = "http://example.com/v2-to-fhir-converter/Identifier/MYSTERY-LAB";
      }
      const result = await runRemediation(
        { raw: JSON.stringify(unmapped), mappings: [], autoFix: true },
        deps,
      );
      const suggestion = result.suggestions.find(
        (s) => s.type === "authority_to_system" && s.sourceValue === "MYSTERY-LAB",
      );
      expect(suggestion).toBeDefined();
      expect(suggestion?.confidence).toBeGreaterThan(0);
    },
    120_000,
  );

  it(
    "converts a real HL7v2 ADT^A01 message end to end",
    async () => {
      const hl7 = [
        "MSH|^~\\&|SIMHOSP|SFAC|RAPP|RFAC|20200508131015||ADT^A01|517|T|2.3|||AL||44|ASCII",
        "EVN|A01|20200508131015|||C005^Whittingham^Sylvia^^^Dr^^^DRNBR^PRSNL^^^ORGDR|",
        "PID|1|3735064194^^^SIMULATOR MRN^MRN|3735064194^^^SIMULATOR MRN^MRN~2021051528^^^NHSNBR^NHSNMBR||Esterkin^AKI Scenario 6^^^Miss^^CURRENT||19870112000000|F|||170 Juice Place^^London^^E1 1AA^GBR^HOME||020 3614 5541^HOME|||||||||C^White - British^^^|||||||||",
        "PV1|1|I|OtherWard^MainRoom^Bed 183^Simulated Hospital^^BED^Main Building^4|28b|||C005^Whittingham^Sylvia^^^Dr^^^DRNBR^PRSNL^^^ORGDR|||CAR|||||||||16094728916771313876^^^^visitid||||||||||||||||||||||ARRIVED|||20200508131015||",
      ].join("\r");
      const result = await runRemediation({ raw: hl7, mappings: MAPPINGS, autoFix: true }, deps);
      expect(result.inputType).toBe("hl7v2");
      expect(result.resourceCount).toBeGreaterThan(0);
    },
    120_000,
  );
});
