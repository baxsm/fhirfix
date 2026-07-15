import { Queue } from "bullmq";
import { env } from "@/lib/env";

// queue names are the single source of truth shared with the worker (phase 2).
export const QUEUE_NAMES = {
  remediation: "remediation",
  apply: "apply",
  conversion: "conversion",
  conformance: "conformance",
  webhook: "webhook",
} as const;

// bullmq owns its own ioredis connection from the url, so its bundled ioredis
// type is used consistently (avoids the two-copies type clash with our client).
const connection = { url: env.REDIS_URL };

// producers live in the backend; the worker (phase 2) attaches consumers.
// defined now so the wiring exists; no jobs are enqueued in phase 1.
export const remediationQueue = new Queue(QUEUE_NAMES.remediation, { connection });
export const applyQueue = new Queue(QUEUE_NAMES.apply, { connection });
export const conversionQueue = new Queue(QUEUE_NAMES.conversion, { connection });
export const conformanceQueue = new Queue(QUEUE_NAMES.conformance, { connection });
// outbound webhook delivery. one job per (event, workspace); the worker fans out
// to every subscribed endpoint. BullMQ retries with backoff on delivery failure.
export const webhookQueue = new Queue(QUEUE_NAMES.webhook, { connection });

export interface WebhookJob {
  event: "run.completed" | "run.failed" | "batch.completed" | "credits.low";
  workspaceId: string;
  data: Record<string, unknown>;
}

// enqueue a webhook event. safe to call from any completion path; if no endpoints
// are subscribed the worker simply no-ops. retries: 5 attempts, exponential backoff.
export async function dispatchWebhook(job: WebhookJob): Promise<void> {
  await webhookQueue.add("deliver", job, {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}
