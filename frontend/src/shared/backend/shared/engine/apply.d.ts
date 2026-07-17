import type { EngineFinding, RegistryMapping } from "./types";
import type { EngineDeps } from "./remediate";
export interface ApplyFixInput {
    corrected: string;
    fingerprints: string[];
    mappings: RegistryMapping[];
    profiles?: string[];
}
export interface ApplyFixResult {
    correctedResource: unknown;
    findings: EngineFinding[];
    conformanceScoreAfter: number;
    appliedFingerprints: string[];
    skippedFingerprints: string[];
    reVerifiedClean: boolean;
}
export declare function applyFixes(input: ApplyFixInput, deps: EngineDeps): Promise<ApplyFixResult>;
export interface AiFixInput {
    corrected: string;
    fingerprint: string;
    finding: {
        fhirpath: string | null;
        plainMessage: string;
        rawValidatorMessage: string;
        resourceType: string | null;
    };
    mappings: RegistryMapping[];
    profiles?: string[];
    apiKey: string;
    model: string;
}
export interface AiFixResult {
    applied: boolean;
    correctedResource: unknown;
    findings: EngineFinding[];
    conformanceScoreAfter: number;
    explanation: string;
    patchPath: string | null;
    reVerifiedClean: boolean;
}
export declare function fixWithAi(input: AiFixInput, deps: EngineDeps): Promise<AiFixResult>;
