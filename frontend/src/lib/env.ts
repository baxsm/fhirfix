import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  },
  client: {
    // base url of the standalone backend (Hono). the dashboard talks to it over http.
    NEXT_PUBLIC_API_URL: z.url(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.url().optional(),
    // mirrors the backend's GOOGLE_ENABLED. a TEST_ placeholder counts as unset,
    // so the button is absent rather than present and broken.
    NEXT_PUBLIC_GOOGLE_ENABLED: z
      .string()
      .default("false")
      .transform((v) => v === "true"),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
