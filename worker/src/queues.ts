import { Queue } from "bullmq";
import { env } from "./env";

const connection = { url: env.REDIS_URL };

export const webhookQueue = new Queue("webhook", { connection });

export const scheduleQueue = new Queue("schedule", { connection });
export const remediationQueue = new Queue("remediation", { connection });
export const retentionQueue = new Queue("retention", { connection });

const RETENTION_SCHEDULER_ID = "retention:sweep";

// the fixed id must stay: a restart re-registers the scheduler rather than stacking one
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
