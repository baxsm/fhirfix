export type ApiKeyMode = "test" | "live";
export interface GeneratedKey {
    full: string;
    prefix: string;
    hash: string;
}
export declare function hashKey(full: string): string;
export declare function generateKey(mode: ApiKeyMode): GeneratedKey;
export declare function parseKeyMode(full: string): ApiKeyMode | null;
export declare function hashesEqual(a: string, b: string): boolean;
