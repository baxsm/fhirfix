import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const apiRequestLog = pgTable(
  "api_request_log",
  {
    id: text("id").primaryKey(), // areq_...
    workspaceId: text("workspace_id").notNull(),
    apiKeyId: text("api_key_id"),
    method: text("method").notNull(),
    path: text("path").notNull(),
    statusCode: integer("status_code").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    requestBytes: integer("request_bytes"),
    responseBytes: integer("response_bytes"),
    idempotencyKey: text("idempotency_key"),
    runId: text("run_id"), // set when the call produced a run
    ip: text("ip"),
    errorCode: text("error_code"), // machine code (e.g. rate_limited, out_of_credits) for filtering
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index("api_log_workspace_idx").on(t.workspaceId, t.createdAt),
    byKey: index("api_log_key_idx").on(t.apiKeyId),
  }),
);

export type ApiRequestLog = typeof apiRequestLog.$inferSelect;
export type NewApiRequestLog = typeof apiRequestLog.$inferInsert;
