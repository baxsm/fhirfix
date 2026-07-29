import { Queue } from "bullmq";
import { env } from "./env";

const connection = { url: env.REDIS_URL };

export const webhookQueue = new Queue("webhook", { connection });

export const scheduleQueue = new Queue("schedule", { connection });
export const remediationQueue = new Queue("remediation", { connection });
export const retentionQueue = new Queue("retention", { connection });

const RETENTION_SCHEDULER_ID = "retention:sweep";

// one hourly sweep for the whole deployment. registering by a fixed id means a
// worker restart re-registers the same scheduler rather than stacking new ones.
export async function registerRetentionSweep(): Promise<void> {
  await retentionQueue.upsertJobScheduler(
    RETENTION_SCHEDULER_ID,
    { pattern: "0 * * * *" },
    { name: "sweep", opts: { removeOnComplete: 100, removeOnFail: 100 } },
  );
}

export interface WebhookJob {
  event:
    | "run.completed"
    | "run.failed"
    | "batch.completed"
    | "credits.low"
    | "drift.detected"
    | "conformance.completed";
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
