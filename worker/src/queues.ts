import { Queue } from "bullmq";
import { env } from "./env";

// the worker is normally a consumer, but run completion (async jobs) needs to
// PRODUCE webhook-delivery jobs. one job per (event, workspace); the webhook
// worker fans out to subscribed endpoints. mirrors backend/src/queues.
const connection = { url: env.REDIS_URL };

export const webhookQueue = new Queue("webhook", { connection });

export interface WebhookJob {
  event: "run.completed" | "run.failed" | "batch.completed" | "credits.low";
  workspaceId: string;
  data: Record<string, unknown>;
}

export async function dispatchWebhook(job: WebhookJob): Promise<void> {
  await webhookQueue.add("deliver", job, {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  });
}
