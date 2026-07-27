import { type EngineConfig, getEngineDeps } from "@shared/engine";
import { env } from "./env";

const config: EngineConfig = {
  validatorUrls: env.VALIDATOR_URL_LIST,
  validatorMaxInFlight: Number(env.VALIDATOR_MAX_INFLIGHT),
  converterUrl: env.CONVERTER_URL,
  usCoreVersion: env.US_CORE_VERSION,
};

export const { deps: engineDeps, ensureWarm: ensureEngineWarm } = getEngineDeps(config);
