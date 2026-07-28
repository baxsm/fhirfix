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
    INFERNO_URL: z.url().default("http://localhost:4568"),
    US_CORE_VERSION: z.string().default("6.1.0"),
    WORKER_CONCURRENCY: portSchema.default("4"),

    OPENROUTER_API_KEY: z.string().default(""),
    OPENROUTER_MODEL: z.string().default("google/gemini-2.5-flash"),

    WEBHOOK_ENCRYPTION_KEY: z.string().min(32).default("dev-webhook-enc-key-change-me-32byte!"),

    ZEPTOMAIL_TOKEN: z.string().default(""),
    ZEPTOMAIL_FROM_ADDRESS: z.email().default("no-reply@fhirfix.dev"),
    ZEPTOMAIL_FROM_NAME: z.string().default("FHIRfix"),
    EMAIL_TEST_MODE: z
      .string()
      .default("true")
      .transform((v) => v === "true"),

    // most runs complete here, so auto-recharge fires here too.
    POLAR_ACCESS_TOKEN: z.string().default(""),
    POLAR_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_PRODUCT_PACK_10: z.string().default(""),
    POLAR_PRODUCT_PACK_25: z.string().default(""),
    POLAR_PRODUCT_PACK_100: z.string().default(""),

    // deep links in alert emails point back at the dashboard.
    APP_URL: z.url().default("http://localhost:3000"),
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
