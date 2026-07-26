import type { Db } from "./client";
export type WebhookEvent = "run.completed" | "run.failed" | "batch.completed" | "credits.low" | "drift.detected";
export declare function listEndpointsForEvent(db: Db, workspaceId: string, event: WebhookEvent): Promise<{
    id: string;
    url: string;
    secret: string;
    events: string[];
}[]>;
export declare function signPayload(secret: string, event: WebhookEvent, data: Record<string, unknown>, timestampMs: number): {
    body: string;
    signature: string;
};
export declare function verifySignature(secret: string, header: string, body: string, toleranceSeconds?: number, nowMs?: number): boolean;
export declare function recordDelivery(db: Db, args: {
    workspaceId: string;
    endpointId: string;
    url: string;
    event: WebhookEvent;
    status: "sent" | "failed";
    statusCode?: number;
    error?: string;
}): Promise<void>;
