import { ENGINE_VERSION } from "@shared/engine";
import { Worker } from "bullmq";
import { type ApplyJob, executeApply } from "./apply-service";
import { env } from "./env";
import { logger } from "./lib";
import { executeRun, type RemediationJob } from "./run-service";

const connection = { url: env.REDIS_URL };
const concurrency = Number(env.WORKER_CONCURRENCY);

const worker = new Worker<RemediationJob>(
  "remediation",
  async (job) => {
    await executeRun(job.data);
  },
  { connection, concurrency },
);

// the apply queue: one-click Apply, apply-all-safe, and Fix-with-AI run here so
// they reuse the same warm validator pool as the initial run.
const applyWorker = new Worker<ApplyJob>(
  "apply",
  async (job) => {
    await executeApply(job.data);
  },
  { connection, concurrency },
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

logger.info("worker.start", `fhirfix remediation worker up (engine ${ENGINE_VERSION}), concurrency ${env.WORKER_CONCURRENCY}`);

async function shutdown() {
  logger.info("worker.shutdown", "draining");
  await Promise.all([worker.close(), applyWorker.close()]);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
