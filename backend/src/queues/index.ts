import { Queue } from "bullmq";
import { env } from "@/lib/env";

// queue names are the single source of truth shared with the worker (phase 2).
export const QUEUE_NAMES = {
  remediation: "remediation",
  apply: "apply",
  conversion: "conversion",
  conformance: "conformance",
  webhook: "webhook",
  schedule: "schedule",
} as const;

const connection = { url: env.REDIS_URL };

export const remediationQueue = new Queue(QUEUE_NAMES.remediation, { connection });
export const applyQueue = new Queue(QUEUE_NAMES.apply, { connection });
export const conversionQueue = new Queue(QUEUE_NAMES.conversion, { connection });
export const conformanceQueue = new Queue(QUEUE_NAMES.conformance, { connection });
export const webhookQueue = new Queue(QUEUE_NAMES.webhook, { connection });

export const scheduleQueue = new Queue(QUEUE_NAMES.schedule, { connection });

// must match the worker's schedulerId() or create/update/delete address different keys
export function schedulerId(scheduledCheckId: string): string {
  return `sched:${scheduledCheckId}`;
}

export async function registerSchedule(
  scheduledCheckId: string,
  cronPattern: string,
): Promise<void> {
  await scheduleQueue.upsertJobScheduler(
    schedulerId(scheduledCheckId),
    { pattern: cronPattern },
    {
      name: "fire",
      data: { scheduledCheckId },
      opts: { removeOnComplete: 100, removeOnFail: 500 },
    },
  );
}

export async function unregisterSchedule(scheduledCheckId: string): Promise<void> {
  await scheduleQueue.removeJobScheduler(schedulerId(scheduledCheckId));
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
