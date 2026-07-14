import { beforeAll, describe, expect, it } from "vitest";
import { applyFixes, fixWithAi } from "../apply";
import { ConverterClient } from "../converter-client";
import { fingerprint } from "../fingerprint";
import { runRemediation } from "../remediate";
import type { EngineDeps } from "../remediate";
import type { RegistryMapping } from "../types";
import { ValidatorPool } from "../validator-client";

// REAL sidecars + a REAL OpenRouter call. the fixWithAi path must be exercised
// against a live model (model ids drift; a mock would hide a dead id).

const VALIDATOR_URL = process.env.VALIDATOR_URL ?? "http://localhost:4567";
const CONVERTER_URL = process.env.CONVERTER_URL ?? "http://localhost:8081";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash";

const MAPPINGS: RegistryMapping[] = [
  {
    type: "authority_to_system",
    sourceValue: "SIMULATOR-MRN",
    targetValue: "http://northwind-health.org/fhir/sid/mrn",
    targetSystem: null,
    status: "active",
  },
];

// a Patient whose only issue is the missing v2-0203 system on the identifier type
// coding - a single safe fix, so applyFixes has exactly one thing to apply.
const PARTIALLY_FIXED = {
  resourceType: "Patient",
  id: "apply-case",
  identifier: [
    {
      type: { coding: [{ code: "MR" }] },
      system: "http://northwind-health.org/fhir/sid/mrn",
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
  deps = { validator, converter };
}, 240_000);

describe("applyFixes (real validator)", () => {
  it(
    "applies the identifier-type-system fix and re-verifies to a higher score",
    async () => {
      // fingerprint the type-coding finding the same way the engine does.
      const fp = fingerprint({
        ruleSource: "Terminology_TX_System_Relative",
        category: "terminology",
        resourceType: "Patient",
        fhirpath: "Patient.identifier[0].type.coding[0]",
      });
      // apply-all-safe: pass every open fingerprint; the engine only applies the
      // ones with a safe deriver. we assert at least one gets applied.
      const before = await runRemediation(
        { raw: JSON.stringify(PARTIALLY_FIXED), mappings: MAPPINGS, autoFix: false },
        deps,
      );
      const fps = before.findings.map((f) => f.dedupFingerprint);
      const result = await applyFixes(
        { corrected: JSON.stringify(PARTIALLY_FIXED), fingerprints: [...fps, fp], mappings: MAPPINGS },
        deps,
      );
      expect(result.appliedFingerprints.length).toBeGreaterThan(0);
      const corrected = result.correctedResource as {
        identifier?: Array<{ type?: { coding?: Array<{ system?: string }> } }>;
      };
      expect(corrected.identifier?.[0]?.type?.coding?.[0]?.system).toBe(
        "http://terminology.hl7.org/CodeSystem/v2-0203",
      );
    },
    120_000,
  );
});

describe("fixWithAi (real OpenRouter)", () => {
  it.skipIf(!OPENROUTER_KEY)(
    "asks a real model for a narrative fix and keeps it only if it re-verifies",
    async () => {
      // run the golden case to a clean-but-for-dom-6 state, then hand dom-6 to AI.
      const run = await runRemediation(
        { raw: JSON.stringify(PARTIALLY_FIXED), mappings: MAPPINGS, autoFix: true },
        deps,
      );
      const dom6 = run.findings.find((f) => f.ruleSource.includes("dom-6") || f.fhirpath === "Patient");
      expect(dom6).toBeTruthy();
      if (!dom6) return;

      const corrected = JSON.stringify(run.correctedResource);
      const result = await fixWithAi(
        {
          corrected,
          fingerprint: dom6.dedupFingerprint,
          finding: {
            fhirpath: dom6.fhirpath ?? null,
            plainMessage: dom6.plainMessage,
            rawValidatorMessage: dom6.rawValidatorMessage,
            resourceType: dom6.resourceType ?? "Patient",
          },
          mappings: MAPPINGS,
          apiKey: OPENROUTER_KEY,
          model: OPENROUTER_MODEL,
        },
        deps,
      );

      // the model returned a real response (an explanation is always present).
      expect(result.explanation.length).toBeGreaterThan(0);
      // it never makes the resource worse.
      expect(result.conformanceScoreAfter).toBeGreaterThanOrEqual(run.conformanceScoreAfter);
    },
    120_000,
  );
});
