import type { EngineFinding, FixConfidence, MappingSuggestion, RegistryMapping } from "./types";
export interface DerivedFix {
    fhirpath: string;
    before: unknown;
    after: unknown;
    confidence: FixConfidence;
    safe: boolean;
    suggestedFix: string;
    apply: (resource: unknown) => boolean;
}
export interface FixContext {
    mappings: RegistryMapping[];
    suggestions: MappingSuggestion[];
}
export declare function remapPlaceholderSystems(resource: unknown, ctx: FixContext): Array<{
    fhirpath: string;
    before: string;
    after: string;
    safe: boolean;
}>;
export declare function deriveFix(resource: unknown, finding: EngineFinding, ctx: FixContext): DerivedFix | undefined;
