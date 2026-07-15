import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "@/auth/auth";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { initSentry } from "@/lib/sentry";
import { apiV1 } from "@/routes/api-v1/index";
import { exportRoutes } from "@/routes/export";
import { polarWebhookRoutes } from "@/routes/polar-webhook";
import { publicRoutes } from "@/routes/public";
import { createTRPCContext } from "@/trpc/context";
import { appRouter } from "@/trpc/routers/index";

initSentry();

const app = new Hono();

// the dashboard/session-cookie CORS policy: reflect trusted origins exactly (not
// "*") and allow credentials. applied per-path to session surfaces only.
const dashboardCors = cors({
  origin: env.TRUSTED_ORIGIN_LIST,
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS"],
});

// cross-origin dashboard: the frontend calls this backend with credentials, so
// the origin must be reflected exactly (not "*") and credentials allowed. the
// public REST API (/api/v1) is Bearer-key auth with its OWN permissive CORS, so
// it is excluded here - dashboard CORS must never widen to "*" with credentials.
app.use("/trpc/*", dashboardCors);
app.use("/api/auth/*", dashboardCors);
app.use("/api/runs/*", dashboardCors);
app.use("/api/demo/*", dashboardCors);
app.use("/api/share/*", dashboardCors);

app.get("/health", (c) => c.json({ ok: true, service: "fhirfix-backend" }));

// the public REST API mounts first with its own CORS (Bearer auth, permissive
// origin, Idempotency-Key allowed). it is intentionally NOT under dashboardCors.
app.route("/api/v1", apiV1);

// Better Auth owns all /api/auth/** routes (sign-in/up, verify, reset, org, etc).
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// unauthenticated marketing demo + public share reads (rate-limited, PHI-safe).
app.route("/", publicRoutes);
// authenticated report exports + corrected-artifact fetch (session-gated REST).
app.route("/", exportRoutes);
// Polar billing webhooks (server-to-server, signature-verified, no session).
app.route("/", polarWebhookRoutes);

// dashboard tRPC surface.
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext: (_opts, c) => createTRPCContext(c),
  }),
);

const port = Number(env.BACKEND_PORT);
logger.info("server.start", `fhirfix backend on :${port}`);

export default {
  port,
  fetch: app.fetch,
};

export type { AppRouter } from "@/trpc/routers/index";
