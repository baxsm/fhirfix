import type { Db } from "./client";
export interface BlobStore {
    put(key: string, content: string, contentType: string): Promise<{
        sha256: string;
        sizeBytes: number;
    }>;
    get(key: string): Promise<string>;
}
export declare function createBlobStore(db: Db): BlobStore;
