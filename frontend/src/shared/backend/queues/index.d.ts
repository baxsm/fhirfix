import { Queue } from "bullmq";
export declare const QUEUE_NAMES: {
    readonly remediation: "remediation";
    readonly apply: "apply";
    readonly conversion: "conversion";
    readonly conformance: "conformance";
    readonly webhook: "webhook";
};
export declare const remediationQueue: Queue<any, any, string, any, any, string>;
export declare const applyQueue: Queue<any, any, string, any, any, string>;
export declare const conversionQueue: Queue<any, any, string, any, any, string>;
export declare const conformanceQueue: Queue<any, any, string, any, any, string>;
export declare const webhookQueue: Queue<any, any, string, any, any, string>;
export interface WebhookJob {
    event: "run.completed" | "run.failed" | "batch.completed" | "credits.low";
    workspaceId: string;
    data: Record<string, unknown>;
}
export declare function dispatchWebhook(job: WebhookJob): Promise<void>;
