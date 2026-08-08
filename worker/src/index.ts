import { performAutoRecharge } from "@shared/db/auto-recharge";
import { sweepExpiredBlobs } from "@shared/db/retention";
import {
  setAutoRechargeHandler,
  setLowBalanceSender,
  setLowBalanceWebhook,
} from "@shared/db/runs";
import { ENGINE_VERSION } from "@shared/engine";
import { Worker } from "bullmq";
import { type ApplyJob, executeApply } from "./apply-service";
import { type ConformanceJob, executeConformancePacket } from "./conformance-service";
import { sendLowBalanceEmail } from "./email";
import { env } from "./env";
import { db, logger } from "./lib";
import { chargeSavedMethod, isBillingConfigured, productIdForPack } from "./polar";
import { dispatchWebhook, registerRetentionSweep, type WebhookJob } from "./queues";
import { executeRun, type RemediationJob } from "./run-service";
import { executeScheduledCheck, type ScheduleJob } from "./schedule-service";
import { syncSchedulers } from "./schedule-sync";
import { executeWebhook } from "./webhook-service";

const connection = { url: env.REDIS_URL };
const concurrency = Number(env.WORKER_CONCURRENCY);

// runs complete here, so this process hits the low-balance and auto-recharge triggers
setLowBalanceSender(sendLowBalanceEmail);
setLowBalanceWebhook(({ workspaceId, threshold, balanceMicro }) =>
  dispatchWebhook({
    event: "credits.low",
    workspaceId,
    data: { threshold, balanceMicro, balanceDollars: balanceMicro / 1_000_000 },
  }),
);
setAutoRechargeHandler((args) =>
  performAutoRecharge(
    db,
    {
      charge: chargeSavedMethod,
      productIdForPack,
      isConfigured: isBillingConfigured,
      onError: (context, detail) => logger.error(context, detail),
    },
    args,
  ),
);

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

// must stay serial: inferno 409s a second concurrent run on the same session
const conformanceWorker = new Worker<ConformanceJob>(
  "conformance",
  async (job) => {
    await executeConformancePacket(job.data);
  },
  { connection, concurrency: 1 },
);

// must stay serial: two bulk deletes would contend on the same rows
const retentionWorker = new Worker(
  "retention",
  async () => {
    const { scanned, purged } = await sweepExpiredBlobs(db);
    if (scanned > 0) logger.info("retention.sweep", `purged ${purged} of ${scanned} expired`);
  },
  { connection, concurrency: 1 },
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
conformanceWorker.on("failed", (job, err) => {
  logger.error("conformance.failed", `${job?.data.packetRunId ?? "?"}: ${err.message}`);
});
conformanceWorker.on("error", (err) => {
  logger.error("conformance.error", err.message);
});
scheduleWorker.on("failed", (job, err) => {
  logger.error("schedule.failed", `${job?.data.scheduledCheckId ?? "?"}: ${err.message}`);
});
scheduleWorker.on("error", (err) => {
  logger.error("schedule.error", err.message);
});

logger.info("worker.start", `fhirfix remediation worker up (engine ${ENGINE_VERSION}), concurrency ${env.WORKER_CONCURRENCY}`);

await syncSchedulers().catch((err) => logger.error("schedule.sync", String(err)));
await registerRetentionSweep().catch((err) => logger.error("retention.register", String(err)));

async function shutdown() {
  logger.info("worker.shutdown", "draining");
  await Promise.all([
    worker.close(),
    applyWorker.close(),
    webhookWorker.close(),
    conformanceWorker.close(),
    scheduleWorker.close(),
    retentionWorker.close(),
  ]);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
