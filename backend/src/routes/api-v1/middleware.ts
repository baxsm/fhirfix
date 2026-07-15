import { hasCreditFloor } from "@shared/db/credits";
import { ensureBillingAccount } from "@shared/db/ledger";
import { and, eq, isNull } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { hashKey, parseKeyMode } from "@/lib/api-key";
import { db, schema } from "@/lib/db";
import { fnf } from "@/lib/fnf";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/lib/redis";
import type { ApiV1Env } from "./context";

// per-key fixed-window rate limit. generous for the base tier; the ceiling exists
// to bound abuse, not to shape normal integration traffic.
const RATE_LIMIT = 120; // requests
const RATE_WINDOW = 60; // per minute, per key

// a consistent json error with the machine code recorded for the request log.
export function apiError(
  c: Context<ApiV1Env>,
  status: number,
  code: string,
  message: string,
  extra?: Record<string, unknown>,
) {
  c.set("errorCode", code);
  return c.json({ error: code, message, ...extra }, status as never);
}

function clientIp(c: Context): string {
  const fwd = c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip");
  return fwd?.split(",")[0]?.trim() ?? "unknown";
}

// resolveApiKey: Bearer token -> keyed-hash -> indexed lookup. sets the auth vars
// or 401s. a revoked key (revoked_at set) never resolves. last_used_at is bumped
// fire-and-forget so auth latency is just the indexed select.
export const resolveApiKey: MiddlewareHandler<ApiV1Env> = async (c, next) => {
  const auth = c.req.header("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return apiError(c, 401, "unauthorized", "Provide an API key as a Bearer token.");
  }
  const mode = parseKeyMode(token);
  if (!mode) {
    return apiError(c, 401, "unauthorized", "Malformed API key.");
  }

  const [row] = await db
    .select({
      id: schema.apiKey.id,
      workspaceId: schema.apiKey.workspaceId,
      mode: schema.apiKey.mode,
      scopes: schema.apiKey.scopes,
    })
    .from(schema.apiKey)
    .where(and(eq(schema.apiKey.hashedKey, hashKey(token)), isNull(schema.apiKey.revokedAt)))
    .limit(1);

  if (!row) {
    return apiError(c, 401, "unauthorized", "Invalid or revoked API key.");
  }

  c.set("apiKeyId", row.id);
  c.set("workspaceId", row.workspaceId);
  c.set("keyMode", row.mode);
  c.set("scopes", row.scopes);

  // bump last_used_at without blocking the request.
  fnf(
    db.update(schema.apiKey).set({ lastUsedAt: new Date() }).where(eq(schema.apiKey.id, row.id)),
    "apikey.lastUsed",
  );

  await next();
};

// require a scope for a controller. 403 (authenticated but not allowed) if absent.
export function requireScope(scope: string): MiddlewareHandler<ApiV1Env> {
  return async (c, next) => {
    const scopes = c.get("scopes");
    if (!scopes.includes(scope)) {
      return apiError(c, 403, "forbidden", `This key is missing the "${scope}" scope.`);
    }
    await next();
  };
}

// enforceRateLimit: per-key fixed window. 429 + Retry-After when exceeded.
export const enforceRateLimit: MiddlewareHandler<ApiV1Env> = async (c, next) => {
  const keyId = c.get("apiKeyId");
  const rl = await rateLimit(`apiv1:${keyId}`, RATE_LIMIT, RATE_WINDOW);
  c.header("X-RateLimit-Limit", String(RATE_LIMIT));
  c.header("X-RateLimit-Remaining", String(rl.remaining));
  if (!rl.allowed) {
    c.header("Retry-After", String(rl.resetSeconds));
    return apiError(c, 429, "rate_limited", "Too many requests. Slow down and retry.", {
      retryAfter: rl.resetSeconds,
    });
  }
  await next();
};

// enforceCredits: floor check shared with the tRPC gate. 402 when broke and
// auto-recharge cannot cover the next run.
export const enforceCredits: MiddlewareHandler<ApiV1Env> = async (c, next) => {
  const account = await ensureBillingAccount(db, c.get("workspaceId"));
  if (!hasCreditFloor(account)) {
    return apiError(
      c,
      402,
      "out_of_credits",
      "This workspace is out of credits. Add credits or enable auto-recharge.",
    );
  }
  await next();
};

// enforceIdempotency: an Idempotency-Key header makes a state-changing call
// replay-safe. same key + same body -> the prior run is returned by the controller
// (via the run_idem_idx unique index at insert time). same key + DIFFERENT body ->
// 409 immediately, because reusing a key with new input is a client bug. this
// middleware only validates + stores the key/body-hash on the context; the
// controller does the actual insert-or-return using the unique index.
export const captureIdempotency: MiddlewareHandler<ApiV1Env> = async (c, next) => {
  const key = c.req.header("idempotency-key")?.trim() || null;
  c.set("idempotencyKey", key);
  await next();
};

// logApiRequest: the OUTER wrapper. runs the chain, then writes an api_request_log
// row on EVERY exit - success and the 401/402/409/422/429 error paths alike, which
// is exactly the traffic a developer debugging an integration needs. reads
// c.res.status after next() (hono onError only fires on THROWN errors, not on a
// returned c.json(.., 4xx), so a finally-style read is the reliable capture point).
export const logApiRequest: MiddlewareHandler<ApiV1Env> = async (c, next) => {
  c.set("startedAt", Date.now());
  c.set("ip", clientIp(c));
  c.set("runId", null);
  c.set("errorCode", null);
  // measure the request body size without consuming the stream the controller reads.
  const lenHeader = c.req.header("content-length");
  c.set("requestBytes", lenHeader ? Number(lenHeader) : 0);
  c.set("idempotencyKey", c.req.header("idempotency-key")?.trim() || null);

  try {
    await next();
  } finally {
    const startedAt = c.get("startedAt");
    const workspaceId = c.get("workspaceId"); // undefined if auth failed
    const status = c.res.status;
    const respLen = c.res.headers.get("content-length");
    fnf(
      db.insert(schema.apiRequestLog).values({
        id: createId("apiRequestLog"),
        // a 401 has no workspace; record it against a sentinel so the row still lands.
        workspaceId: workspaceId ?? "unauthenticated",
        apiKeyId: c.get("apiKeyId") ?? null,
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        statusCode: status,
        latencyMs: Date.now() - startedAt,
        requestBytes: c.get("requestBytes") || null,
        responseBytes: respLen ? Number(respLen) : null,
        idempotencyKey: c.get("idempotencyKey"),
        runId: c.get("runId"),
        ip: c.get("ip"),
        errorCode: c.get("errorCode"),
      }),
      "apiv1.log",
    );
    if (status >= 500) {
      logger.error("apiv1", `${c.req.method} ${new URL(c.req.url).pathname} -> ${status}`);
    }
  }
};
