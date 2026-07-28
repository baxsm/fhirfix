import { Queue } from "bullmq";
export declare const QUEUE_NAMES: {
    readonly remediation: "remediation";
    readonly apply: "apply";
    readonly conversion: "conversion";
    readonly conformance: "conformance";
    readonly webhook: "webhook";
    readonly schedule: "schedule";
};
export declare const remediationQueue: Queue<any, any, string, any, any, string>;
export declare const applyQueue: Queue<any, any, string, any, any, string>;
export declare const conversionQueue: Queue<any, any, string, any, any, string>;
export declare const conformanceQueue: Queue<any, any, string, any, any, string>;
export declare const webhookQueue: Queue<any, any, string, any, any, string>;
export declare const scheduleQueue: Queue<any, any, string, any, any, string>;
export declare function schedulerId(scheduledCheckId: string): string;
export declare function registerSchedule(scheduledCheckId: string, cronPattern: string): Promise<void>;
export declare function unregisterSchedule(scheduledCheckId: string): Promise<void>;
export interface WebhookJob {
    event: "run.completed" | "run.failed" | "batch.completed" | "credits.low" | "drift.detected" | "conformance.completed";
    workspaceId: string;
    data: Record<string, unknown>;
}
export declare function dispatchWebhook(job: WebhookJob): Promise<void>;
