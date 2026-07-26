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

// scheduled checks. the backend is a producer of SCHEDULES (not of firings): it
// upserts a job scheduler when a check is created, edited, enabled or disabled.
// the worker consumes each firing and rebuilds every scheduler from postgres on
// boot, so redis stays disposable.
export const scheduleQueue = new Queue(QUEUE_NAMES.schedule, { connection });

// one scheduler per check, keyed by a derived id so create/update/delete all
// address the same key. must match the worker's schedulerId().
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
  event: "run.completed" | "run.failed" | "batch.completed" | "credits.low" | "drift.detected";
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
