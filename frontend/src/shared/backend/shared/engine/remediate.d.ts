import type { EngineFinding, OperationOutcome, RegistryMapping, RemediationResult } from "./types";
import type { ConverterClient } from "./converter-client";
import type { ValidatorPool } from "./validator-client";
export declare const ENGINE_VERSION = "0.2.0";
export interface RemediationInput {
    raw: string;
    mappings: RegistryMapping[];
    profiles?: string[];
    autoFix?: boolean;
}
export interface EngineDeps {
    validator: ValidatorPool;
    converter: ConverterClient;
}
export declare function collectResources(parsed: unknown): unknown[];
export declare function scoreFrom(findings: EngineFinding[], resourceCount?: number): number;
export declare function validateAll(deps: EngineDeps, resources: unknown[], explicitProfiles: string[] | undefined): Promise<{
    outcome: OperationOutcome;
    profilesApplied: string[];
}>;
export declare function runRemediation(input: RemediationInput, deps: EngineDeps): Promise<RemediationResult>;
