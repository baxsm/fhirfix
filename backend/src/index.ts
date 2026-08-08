import { trpcServer } from "@hono/trpc-server";
import { setAutoRechargeHandler, setLowBalanceSender, setLowBalanceWebhook } from "@shared/db/runs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "@/auth/auth";
import { runAutoRecharge } from "@/lib/auto-recharge";
import { sendLowBalanceEmail } from "@/lib/billing-email";
import { env } from "@/lib/env";
import { getHealthReport } from "@/lib/health";
import { logger } from "@/lib/logger";
import { initSentry } from "@/lib/sentry";
import { dispatchWebhook } from "@/queues/index";
import { apiV1 } from "@/routes/api-v1/index";
import { exportRoutes } from "@/routes/export";
import { polarWebhookRoutes } from "@/routes/polar-webhook";
import { createTRPCContext } from "@/trpc/context";
import { appRouter } from "@/trpc/routers/index";

initSentry();
// the REST api completes runs in-process, so this side needs a transport too.
setLowBalanceSender(sendLowBalanceEmail);
setLowBalanceWebhook(({ workspaceId, threshold, balanceMicro }) =>
  dispatchWebhook({
    event: "credits.low",
    workspaceId,
    data: { threshold, balanceMicro, balanceDollars: balanceMicro / 1_000_000 },
  }),
);
setAutoRechargeHandler(runAutoRecharge);

const app = new Hono();

// origin must be reflected exactly, never "*", because credentials are allowed
const dashboardCors = cors({
  origin: env.TRUSTED_ORIGIN_LIST,
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "OPTIONS"],
});

app.use("/trpc/*", dashboardCors);
app.use("/api/auth/*", dashboardCors);
app.use("/api/runs/*", dashboardCors);

// must not touch postgres: a deploy that cannot reach the db still has to come up
app.get("/health", (c) => c.json({ ok: true, service: "fhirfix-backend" }));

// public and unauthenticated, so it must carry no counts, ids, or workspace scope
app.get("/health/ready", async (c) => {
  const report = await getHealthReport();
  // c.json() would overwrite the content-type, so the body is serialized here.
  return c.body(JSON.stringify(report), report.status === "fail" ? 503 : 200, {
    "Content-Type": "application/health+json",
    "Cache-Control": "no-store",
  });
});

app.route("/api/v1", apiV1);

// PUT/PATCH/DELETE are required by scim: an IdP deprovisions with PATCH active=false
app.on(["GET", "POST", "PUT", "PATCH", "DELETE"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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
