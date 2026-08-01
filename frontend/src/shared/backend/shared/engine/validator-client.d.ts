import type { OperationOutcome } from "./types";
import { type ResilienceOptions } from "./resilience";
export interface ValidatorInstance {
    baseUrl: string;
    maxInFlight: number;
}
export interface ValidatorPoolOptions {
    instances: ValidatorInstance[];
    requiredIgs: Array<{
        id: string;
        version: string;
    }>;
    resilience?: Partial<ResilienceOptions>;
    acquireTimeoutMs?: number;
    pollIntervalMs?: number;
}
export declare class ValidatorPool {
    private readonly states;
    private readonly opts;
    private readonly requiredIgs;
    private readonly resilience?;
    constructor(options: ValidatorPoolOptions);
    warmup(): Promise<{
        readyCount: number;
    }>;
    private probeReady;
    get readyCount(): number;
    get instanceCount(): number;
    probeAll(): Promise<{
        readyCount: number;
        total: number;
    }>;
    validate(resource: unknown, profiles: string[]): Promise<OperationOutcome>;
    private acquire;
}
