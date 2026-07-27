import { describe, expect, it } from "vitest";
import { ConverterClient } from "../converter-client";
import { runRemediation } from "../remediate";
import { SidecarError } from "../resilience";
import { ValidatorPool } from "../validator-client";


const NAIVE = JSON.stringify({
  resourceType: "Patient",
  identifier: [{ system: "http://example.com/x", value: "1" }],
  name: [{ family: "X" }],
  gender: "female",
});

describe("sidecar down (real config, dead endpoints)", () => {
  it(
    "validator unreachable -> runRemediation throws SidecarError, does not hang",
    async () => {
      const validator = new ValidatorPool({
        // a port nothing listens on; fast timeout + no retries so the test is quick.
        instances: [{ baseUrl: "http://localhost:9", maxInFlight: 2 }],
        requiredIgs: [{ id: "hl7.fhir.us.core", version: "6.1.0" }],
        resilience: { timeoutMs: 1500, retries: 0, circuitThreshold: 2 },
        acquireTimeoutMs: 3000,
      });
      // warmup fails (0 ready). the pool should refuse traffic rather than hang.
      const warm = await validator.warmup();
      expect(warm.readyCount).toBe(0);

      const converter = new ConverterClient({ baseUrl: "http://localhost:8081" });
      await expect(
        runRemediation({ raw: NAIVE, mappings: [], autoFix: true }, { validator, converter }),
      ).rejects.toBeInstanceOf(SidecarError);
    },
    30_000,
  );
});
