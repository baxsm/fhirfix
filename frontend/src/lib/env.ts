import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // where the server renderer reaches the backend. in a container deployment
    // the public url resolves to the frontend itself, so server-side fetches
    // need the internal service name. defaults to the public url, which is
    // correct everywhere the two are the same host.
    INTERNAL_API_URL: z.url().optional(),
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
    INTERNAL_API_URL: process.env.INTERNAL_API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_ENABLED: process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

// the backend base url for calls made ON THE SERVER. never use this in code
// that also runs in the browser: the internal host is not resolvable there.
export function serverApiUrl(): string {
  return process.env.INTERNAL_API_URL || env.NEXT_PUBLIC_API_URL;
}
