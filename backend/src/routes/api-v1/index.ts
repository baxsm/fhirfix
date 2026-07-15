import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ApiV1Env } from "./context";
import { convertController, fixController, validateController } from "./controllers";
import {
  captureIdempotency,
  enforceCredits,
  enforceRateLimit,
  logApiRequest,
  requireScope,
  resolveApiKey,
} from "./middleware";
import { getReportController } from "./report";
import {
  batchController,
  getCorrectedController,
  getRunController,
  listRunsController,
} from "./runs";

// the public REST API. served by the standalone backend, decoupled from the
// dashboard tRPC surface and the frontend deploy. auth is API-key, not session.
export const apiV1 = new Hono<ApiV1Env>();

// its own CORS: server-to-server callers ignore CORS, but the docs playground
// fires from the browser and needs Idempotency-Key allowed. permissive origin is
// safe here because auth is a Bearer key, not a session cookie.
apiV1.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
  }),
);

// the auth + accounting chain, in order. logApiRequest is outermost so it records
// every exit; then resolve key, rate limit, credits, idempotency capture. charged
// controllers are mounted after this; read-only ones skip enforceCredits per-route.
apiV1.use("*", logApiRequest);
apiV1.use("*", resolveApiKey);
apiV1.use("*", enforceRateLimit);
apiV1.use("*", captureIdempotency);

// health/auth probe behind the full chain (no credit gate). lets an integration
// confirm its key + rate-limit headers before spending anything.
apiV1.get("/ping", (c) =>
  c.json({
    ok: true,
    workspaceId: c.get("workspaceId"),
    mode: c.get("keyMode"),
    scopes: c.get("scopes"),
  }),
);

// a credit-gated probe: same as ping but behind enforceCredits, so an integration
// (or the credit-gate test) can confirm the 402 path without spending anything.
apiV1.get("/ping-credits", enforceCredits, (c) => c.json({ ok: true, funded: true }));

// charged remediation endpoints. each runs the engine synchronously against the
// warm pool, persists a run (source=api), debits credits, and returns inline.
// scope-gated per action; credit-gated so a broke workspace gets 402 before work.
apiV1.post("/validate", requireScope("validate"), enforceCredits, validateController);
apiV1.post("/fix", requireScope("fix"), enforceCredits, fixController);
apiV1.post("/convert", requireScope("convert"), enforceCredits, convertController);

// batch is async: it enqueues to the worker and returns 202. still credit-gated so
// a broke workspace cannot queue work it can never pay for.
apiV1.post("/batch", requireScope("fix"), enforceCredits, batchController);

// read endpoints. scope "runs" for the run history + report; corrected artifact
// reuses the anti-download-manager octet-stream pattern.
apiV1.get("/runs", requireScope("runs"), listRunsController);
apiV1.get("/runs/:id", requireScope("runs"), getRunController);
apiV1.get("/runs/:id/corrected", requireScope("runs"), getCorrectedController);
apiV1.get("/runs/:id/report", requireScope("runs"), getReportController);

export { enforceCredits };
