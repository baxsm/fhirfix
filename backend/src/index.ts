import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "@/auth/auth";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { initSentry } from "@/lib/sentry";
import { exportRoutes } from "@/routes/export";
import { publicRoutes } from "@/routes/public";
import { createTRPCContext } from "@/trpc/context";
import { appRouter } from "@/trpc/routers/index";

initSentry();

const app = new Hono();

// cross-origin dashboard: the frontend calls this backend with credentials,
// so the origin must be reflected exactly (not "*") and credentials allowed.
app.use(
  "*",
  cors({
    origin: env.TRUSTED_ORIGIN_LIST,
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ ok: true, service: "fhirfix-backend" }));

// Better Auth owns all /api/auth/** routes (sign-in/up, verify, reset, org, etc).
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// unauthenticated marketing demo + public share reads (rate-limited, PHI-safe).
app.route("/", publicRoutes);
// authenticated report exports + corrected-artifact fetch (session-gated REST).
app.route("/", exportRoutes);

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
