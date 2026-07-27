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
import { openApiSpec } from "./openapi";
import { getReportController } from "./report";
import {
  batchController,
  getCorrectedController,
  getRunController,
  listRunsController,
} from "./runs";

export const apiV1 = new Hono<ApiV1Env>();

apiV1.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After"],
  }),
);

apiV1.get("/openapi.json", (c) => c.json(openApiSpec));

// order matters: logApiRequest stays outermost so it records rejected calls too
apiV1.use("*", logApiRequest);
apiV1.use("*", resolveApiKey);
apiV1.use("*", enforceRateLimit);
apiV1.use("*", captureIdempotency);

apiV1.get("/ping", (c) =>
  c.json({
    ok: true,
    workspaceId: c.get("workspaceId"),
    mode: c.get("keyMode"),
    scopes: c.get("scopes"),
  }),
);

apiV1.get("/ping-credits", enforceCredits, (c) => c.json({ ok: true, funded: true }));

apiV1.post("/validate", requireScope("validate"), enforceCredits, validateController);
apiV1.post("/fix", requireScope("fix"), enforceCredits, fixController);
apiV1.post("/convert", requireScope("convert"), enforceCredits, convertController);

apiV1.post("/batch", requireScope("fix"), enforceCredits, batchController);

apiV1.get("/runs", requireScope("runs"), listRunsController);
apiV1.get("/runs/:id", requireScope("runs"), getRunController);
apiV1.get("/runs/:id/corrected", requireScope("runs"), getCorrectedController);
apiV1.get("/runs/:id/report", requireScope("runs"), getReportController);

export { enforceCredits };
