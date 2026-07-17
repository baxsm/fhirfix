import type { Db } from "./client";
export declare function recordNotification(db: Db, args: {
    workspaceId: string;
    channel: "email" | "slack" | "webhook";
    type: string;
    target: string;
    status: "sent" | "failed" | "bounced";
    providerMessageId?: string;
    metadata?: Record<string, unknown>;
}): Promise<{
    id: string;
}>;
export declare function hasNotification(db: Db, args: {
    workspaceId: string;
    type: string;
    dedup: string;
}): Promise<boolean>;
