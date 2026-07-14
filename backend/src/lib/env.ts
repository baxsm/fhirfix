import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const portSchema = z
  .string()
  .refine((val) => val.length > 0 && !Number.isNaN(Number(val)), "must be a number");

const baseEnv = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    BACKEND_PORT: portSchema.default("3001"),

    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),

    BETTER_AUTH_SECRET: z.string().min(16),
    BETTER_AUTH_URL: z.url(),
    // comma-separated list of origins allowed to call the backend
    TRUSTED_ORIGINS: z.string().default("http://localhost:3000"),

    ZEPTOMAIL_TOKEN: z.string().default(""),
    ZEPTOMAIL_FROM_ADDRESS: z.email().default("no-reply@fhirfix.dev"),
    ZEPTOMAIL_FROM_NAME: z.string().default("FHIRfix"),
    EMAIL_TEST_MODE: z
      .string()
      .default("true")
      .transform((v) => v === "true"),

    SENTRY_DSN: z.string().default(""),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export const env = {
  ...baseEnv,
  IS_PRODUCTION: baseEnv.NODE_ENV === "production",
  TRUSTED_ORIGIN_LIST: baseEnv.TRUSTED_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};
