import type { EngineDeps } from "./remediate";
export interface EngineConfig {
    validatorUrls: string[];
    validatorMaxInFlight: number;
    converterUrl: string;
    usCoreVersion: string;
}
export declare function getEngineDeps(config: EngineConfig): {
    deps: EngineDeps;
    ensureWarm: () => Promise<{
        readyCount: number;
    }>;
};
export declare function _resetEngineDeps(): void;
