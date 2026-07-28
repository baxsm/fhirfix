import type { AuditAction } from "@shared/db/schema";
import { db } from "./db";
export declare function ipFromHeaders(headers: Headers): string | null;
export declare function recordLogin(args: {
    userId: string;
    ip: string | null;
}): Promise<void>;
type AuditInput = {
    workspaceId: string;
    action: AuditAction;
    actorType: "user" | "api_key" | "system";
    actorId?: string | null;
    targetRef?: string | null;
    ip?: string | null;
    metadata?: Record<string, unknown>;
};
type AuditWriter = Pick<typeof db, "insert">;
export declare function writeAudit(entry: AuditInput, tx?: AuditWriter): Promise<void>;
export {};
