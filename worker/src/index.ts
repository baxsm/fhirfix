import { ENGINE_VERSION } from "@fhirfix/engine";
import { Worker } from "bullmq";
import { env } from "./env";
import { logger } from "./lib";
import { executeRun, type RemediationJob } from "./run-service";

const QUEUE_NAME = "remediation";
const connection = { url: env.REDIS_URL };

const worker = new Worker<RemediationJob>(
  QUEUE_NAME,
  async (job) => {
    await executeRun(job.data);
  },
  {
    connection,
    concurrency: Number(env.WORKER_CONCURRENCY),
  },
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

logger.info("worker.start", `fhirfix remediation worker up (engine ${ENGINE_VERSION}), concurrency ${env.WORKER_CONCURRENCY}`);

async function shutdown() {
  logger.info("worker.shutdown", "draining");
  await worker.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
