import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const portSchema = z
  .string()
  .refine((v) => v.length > 0 && !Number.isNaN(Number(v)), "must be a number");

const base = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

    VALIDATOR_URLS: z.string().default("http://localhost:4567"),
    VALIDATOR_MAX_INFLIGHT: portSchema.default("4"),
    CONVERTER_URL: z.url().default("http://localhost:8081"),
    US_CORE_VERSION: z.string().default("6.1.0"),
    WORKER_CONCURRENCY: portSchema.default("4"),

    // "Fix with AI" hand-off. prose/patch only, subordinate to the deterministic
    // engine. empty key => the AI path is unavailable and the run fails cleanly.
    OPENROUTER_API_KEY: z.string().default(""),
    OPENROUTER_MODEL: z.string().default("google/gemini-2.5-flash"),

    // decrypts webhook signing secrets for outbound delivery. must match the
    // backend's value (which encrypts them). dev default matches backend's.
    WEBHOOK_ENCRYPTION_KEY: z.string().min(32).default("dev-webhook-enc-key-change-me-32byte!"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export const env = {
  ...base,
  VALIDATOR_URL_LIST: base.VALIDATOR_URLS.split(",")
    .map((u) => u.trim())
    .filter(Boolean),
};
