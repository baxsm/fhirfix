import { ConverterClient } from "./converter-client";
import type { EngineDeps } from "./remediate";
import { ValidatorPool } from "./validator-client";

export interface EngineConfig {
  validatorUrls: string[];
  validatorMaxInFlight: number;
  converterUrl: string;
  usCoreVersion: string;
}

let cached: { deps: EngineDeps; warmed: Promise<{ readyCount: number }> } | undefined;

// build (once per process) the shared validator pool + converter client and kick
// off warmup. warmup loads US Core into every instance and ready-gates the pool.
// callers await ensureWarm() before running the engine so a cold instance never
// gets traffic.
export function getEngineDeps(config: EngineConfig): {
  deps: EngineDeps;
  ensureWarm: () => Promise<{ readyCount: number }>;
} {
  if (!cached) {
    const validator = new ValidatorPool({
      instances: config.validatorUrls.map((baseUrl) => ({
        baseUrl,
        maxInFlight: config.validatorMaxInFlight,
      })),
      requiredIgs: [{ id: "hl7.fhir.us.core", version: config.usCoreVersion }],
    });
    const converter = new ConverterClient({ baseUrl: config.converterUrl });
    cached = { deps: { validator, converter }, warmed: validator.warmup() };
  }
  const current = cached;
  return { deps: current.deps, ensureWarm: () => current.warmed };
}

// test-only reset so a suite can rebuild the pool.
export function _resetEngineDeps(): void {
  cached = undefined;
}
