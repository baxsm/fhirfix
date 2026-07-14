import { type EngineConfig, getEngineDeps } from "@fhirfix/engine";
import { env } from "./env";

// the backend's shared warm validator pool + converter. used by the public demo
// endpoint, which runs the engine synchronously (dashboard runs go through the
// worker). same warm-pool singleton pattern as the worker.
const config: EngineConfig = {
  validatorUrls: env.VALIDATOR_URL_LIST,
  validatorMaxInFlight: Number(env.VALIDATOR_MAX_INFLIGHT),
  converterUrl: env.CONVERTER_URL,
  usCoreVersion: env.US_CORE_VERSION,
};

export const { deps: engineDeps, ensureWarm: ensureEngineWarm } = getEngineDeps(config);
