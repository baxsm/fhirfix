import { ENGINE_VERSION } from "@shared/engine";
import { Worker } from "bullmq";
import { type ApplyJob, executeApply } from "./apply-service";
import { env } from "./env";
import { logger } from "./lib";
import type { WebhookJob } from "./queues";
import { executeRun, type RemediationJob } from "./run-service";
import { executeScheduledCheck, type ScheduleJob } from "./schedule-service";
import { syncSchedulers } from "./schedule-sync";
import { executeWebhook } from "./webhook-service";

const connection = { url: env.REDIS_URL };
const concurrency = Number(env.WORKER_CONCURRENCY);

const worker = new Worker<RemediationJob>(
  "remediation",
  async (job) => {
    await executeRun(job.data);
  },
  { connection, concurrency },
);

const applyWorker = new Worker<ApplyJob>(
  "apply",
  async (job) => {
    await executeApply(job.data);
  },
  { connection, concurrency },
);

const webhookWorker = new Worker<WebhookJob>(
  "webhook",
  async (job) => {
    await executeWebhook(job.data);
  },
  { connection, concurrency },
);

const scheduleWorker = new Worker<ScheduleJob>(
  "schedule",
  async (job) => {
    await executeScheduledCheck(job.data);
  },
  { connection, concurrency: 1 },
);

worker.on("failed", (job, err) => {
  logger.error("worker.failed", `${job?.data.runId ?? "?"}: ${err.message}`);
});
worker.on("completed", (job) => {
  logger.debug("worker.completed", job.data.runId);
});
worker.on("error", (err) => {
  logger.error("worker.error", err.message);
});
applyWorker.on("failed", (job, err) => {
  logger.error("apply.failed", `${job?.data.runId ?? "?"}: ${err.message}`);
});
applyWorker.on("error", (err) => {
  logger.error("apply.error", err.message);
});
webhookWorker.on("failed", (job, err) => {
  logger.error("webhook.failed", `${job?.data.event ?? "?"}: ${err.message}`);
});
webhookWorker.on("error", (err) => {
  logger.error("webhook.error", err.message);
});
scheduleWorker.on("failed", (job, err) => {
  logger.error("schedule.failed", `${job?.data.scheduledCheckId ?? "?"}: ${err.message}`);
});
scheduleWorker.on("error", (err) => {
  logger.error("schedule.error", err.message);
});

logger.info("worker.start", `fhirfix remediation worker up (engine ${ENGINE_VERSION}), concurrency ${env.WORKER_CONCURRENCY}`);

await syncSchedulers().catch((err) => logger.error("schedule.sync", String(err)));

async function shutdown() {
  logger.info("worker.shutdown", "draining");
  await Promise.all([
    worker.close(),
    applyWorker.close(),
    webhookWorker.close(),
    scheduleWorker.close(),
  ]);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
