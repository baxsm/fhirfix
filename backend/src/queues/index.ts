import { Queue } from "bullmq";
import { env } from "@/lib/env";

// queue names are the single source of truth shared with the worker (phase 2).
export const QUEUE_NAMES = {
  remediation: "remediation",
  conversion: "conversion",
  conformance: "conformance",
} as const;

// bullmq owns its own ioredis connection from the url, so its bundled ioredis
// type is used consistently (avoids the two-copies type clash with our client).
const connection = { url: env.REDIS_URL };

// producers live in the backend; the worker (phase 2) attaches consumers.
// defined now so the wiring exists; no jobs are enqueued in phase 1.
export const remediationQueue = new Queue(QUEUE_NAMES.remediation, { connection });
export const conversionQueue = new Queue(QUEUE_NAMES.conversion, { connection });
export const conformanceQueue = new Queue(QUEUE_NAMES.conformance, { connection });
