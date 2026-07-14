import * as Sentry from "@sentry/node";
import { env } from "./env";
import { logger } from "./logger";

// wired from the start given the stateful sidecar dependency. no-op without a DSN.
export function initSentry() {
  if (!env.SENTRY_DSN) {
    logger.info("sentry.init", "no DSN, error monitoring disabled");
    return;
  }
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.IS_PRODUCTION ? 0.1 : 1.0,
  });
  logger.info("sentry.init", "enabled");
}

export { Sentry };
