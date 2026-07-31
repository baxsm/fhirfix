export type IdpMetadata = {
    entityId: string;
    entryPoint: string;
    cert: string;
};
export declare function parseIdpMetadata(xml: string): IdpMetadata | null;
export declare function certFingerprint(cert: string): Promise<string>;
