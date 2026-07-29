import type { BlobStore } from "./blob";
import type { Db } from "./client";
export type RedactionPolicy = "off" | "on_ingest" | "required";
export declare function redactionPolicyFor(db: Db, workspaceId: string): Promise<RedactionPolicy>;
export declare function retentionExpiryFor(db: Db, workspaceId: string): Promise<Date>;
export type StoredInput = {
    key: string | null;
    content: string;
    redacted: boolean;
    hadPhi: boolean;
    rejected?: boolean;
};
export declare function storeRunInput(db: Db, blobStore: BlobStore, args: {
    workspaceId: string;
    key: string;
    content: string;
    policy: RedactionPolicy;
}): Promise<StoredInput>;
