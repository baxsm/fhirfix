export declare function stripIndices(fhirpath: string | undefined): string;
export declare function fingerprint(parts: {
    ruleSource: string;
    category: string;
    resourceType?: string;
    fhirpath?: string;
}): string;
