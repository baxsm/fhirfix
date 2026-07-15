import type { WebhookEvent } from "@shared/db/webhooks";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { generateKey } from "@/lib/api-key";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { encryptSecret, generateWebhookSecret } from "@/lib/secret-crypto";
import { dispatchWebhook } from "@/queues/index";
import { router, workspaceProcedure } from "../trpc";

// the scopes a key can hold. mappings write needs the admin-only mapping scope.
const KEY_SCOPES = ["validate", "convert", "fix", "runs", "mappings"] as const;

// the events a webhook endpoint can subscribe to (phase 5 subset of the enum).
const WEBHOOK_EVENTS = ["run.completed", "run.failed", "batch.completed", "credits.low"] as const;

function requireKeyPermission(role: string, action: "create" | "revoke") {
  if (!hasPermission(role as never, "apiKey", action)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage API keys." });
  }
}

// webhook management reuses the apiKey permission (both are developer-surface
// config a member/admin/owner manages).
function requireWebhookPermission(role: string) {
  if (!hasPermission(role as never, "apiKey", "create")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage webhooks." });
  }
}

export const developersRouter = router({
  apiKeys: router({
    // masked list: prefix + metadata only, never the hash or full key. ordered
    // newest first, revoked keys included (shown struck-through in the ui).
    list: workspaceProcedure.query(async ({ ctx }) => {
      return ctx.db
        .select({
          id: schema.apiKey.id,
          name: schema.apiKey.name,
          prefix: schema.apiKey.prefix,
          mode: schema.apiKey.mode,
          scopes: schema.apiKey.scopes,
          createdAt: schema.apiKey.createdAt,
          lastUsedAt: schema.apiKey.lastUsedAt,
          revokedAt: schema.apiKey.revokedAt,
        })
        .from(schema.apiKey)
        .where(eq(schema.apiKey.workspaceId, ctx.workspaceId))
        .orderBy(desc(schema.apiKey.createdAt));
    }),

    // create a key. the full secret is returned ONCE here and never again; only
    // the keyed hash is stored. the client must copy it now.
    create: workspaceProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          name: z.string().min(1).max(80),
          mode: z.enum(["test", "live"]),
          scopes: z.array(z.enum(KEY_SCOPES)).min(1).default(["validate", "convert", "fix"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireKeyPermission(ctx.role, "create");
        const { full, prefix, hash } = generateKey(input.mode);
        const id = createId("apiKey");
        await ctx.db.insert(schema.apiKey).values({
          id,
          workspaceId: ctx.workspaceId,
          name: input.name,
          prefix,
          hashedKey: hash,
          mode: input.mode,
          scopes: input.scopes,
          createdBy: ctx.user.id,
        });
        // audit_log lands in phase 8; until then a structured log line is the trail.
        logger.info(
          "apikey.created",
          `${id} (${input.mode}) in ${ctx.workspaceId} by ${ctx.user.id}`,
        );
        return { id, name: input.name, mode: input.mode, prefix, key: full };
      }),

    // revoke a key immediately. a revoked key fails auth at resolveApiKey. we keep
    // the row (masked) so it stays visible in the list as revoked.
    revoke: workspaceProcedure
      .input(z.object({ workspaceId: z.string(), keyId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        requireKeyPermission(ctx.role, "revoke");
        const res = await ctx.db
          .update(schema.apiKey)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(schema.apiKey.id, input.keyId),
              eq(schema.apiKey.workspaceId, ctx.workspaceId),
              // revoking an already-revoked key is a no-op, not an error.
            ),
          )
          .returning({ id: schema.apiKey.id, revokedAt: schema.apiKey.revokedAt });
        if (res.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "API key not found." });
        }
        logger.info("apikey.revoked", `${input.keyId} in ${ctx.workspaceId} by ${ctx.user.id}`);
        return { revoked: true };
      }),
  }),

  webhooks: router({
    // endpoints for the workspace. the secret is never returned (it is encrypted
    // at rest and only shown once at create/rotate).
    list: workspaceProcedure.query(async ({ ctx }) => {
      return ctx.db
        .select({
          id: schema.webhookEndpoint.id,
          url: schema.webhookEndpoint.url,
          events: schema.webhookEndpoint.events,
          enabled: schema.webhookEndpoint.enabled,
          lastDeliveryStatus: schema.webhookEndpoint.lastDeliveryStatus,
          lastDeliveryAt: schema.webhookEndpoint.lastDeliveryAt,
          createdAt: schema.webhookEndpoint.createdAt,
        })
        .from(schema.webhookEndpoint)
        .where(eq(schema.webhookEndpoint.workspaceId, ctx.workspaceId))
        .orderBy(desc(schema.webhookEndpoint.createdAt));
    }),

    // create an endpoint. the signing secret is generated + returned ONCE, stored
    // encrypted. the url must be https in production (http allowed for local dev).
    create: workspaceProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          url: z.url(),
          events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireWebhookPermission(ctx.role);
        const id = createId("webhook");
        const secret = generateWebhookSecret();
        await ctx.db.insert(schema.webhookEndpoint).values({
          id,
          workspaceId: ctx.workspaceId,
          url: input.url,
          events: input.events,
          secret: encryptSecret(secret),
          createdBy: ctx.user.id,
        });
        logger.info("webhook.created", `${id} -> ${input.url} in ${ctx.workspaceId}`);
        return { id, url: input.url, events: input.events, secret };
      }),

    // rotate the signing secret. breaks the old secret immediately, so the ui
    // confirms it as a consequence. returns the new secret once.
    rotateSecret: workspaceProcedure
      .input(z.object({ workspaceId: z.string(), id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        requireWebhookPermission(ctx.role);
        const secret = generateWebhookSecret();
        const res = await ctx.db
          .update(schema.webhookEndpoint)
          .set({ secret: encryptSecret(secret) })
          .where(
            and(
              eq(schema.webhookEndpoint.id, input.id),
              eq(schema.webhookEndpoint.workspaceId, ctx.workspaceId),
            ),
          )
          .returning({ id: schema.webhookEndpoint.id });
        if (res.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
        }
        logger.info("webhook.rotated", `${input.id} in ${ctx.workspaceId}`);
        return { secret };
      }),

    // enable/disable without deleting - a paused endpoint stops receiving.
    setEnabled: workspaceProcedure
      .input(z.object({ workspaceId: z.string(), id: z.string(), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        requireWebhookPermission(ctx.role);
        const res = await ctx.db
          .update(schema.webhookEndpoint)
          .set({ enabled: input.enabled })
          .where(
            and(
              eq(schema.webhookEndpoint.id, input.id),
              eq(schema.webhookEndpoint.workspaceId, ctx.workspaceId),
            ),
          )
          .returning({ id: schema.webhookEndpoint.id });
        if (res.length === 0)
          throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
        return { enabled: input.enabled };
      }),

    delete: workspaceProcedure
      .input(z.object({ workspaceId: z.string(), id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        requireWebhookPermission(ctx.role);
        const res = await ctx.db
          .delete(schema.webhookEndpoint)
          .where(
            and(
              eq(schema.webhookEndpoint.id, input.id),
              eq(schema.webhookEndpoint.workspaceId, ctx.workspaceId),
            ),
          )
          .returning({ id: schema.webhookEndpoint.id });
        if (res.length === 0)
          throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found." });
        logger.info("webhook.deleted", `${input.id} in ${ctx.workspaceId}`);
        return { deleted: true };
      }),

    // fire a test event at the workspace's endpoints so a developer can confirm
    // their receiver + signature verification before relying on it.
    testPing: workspaceProcedure
      .input(z.object({ workspaceId: z.string(), event: z.enum(WEBHOOK_EVENTS).optional() }))
      .mutation(async ({ ctx, input }) => {
        requireWebhookPermission(ctx.role);
        const event = (input.event ?? "run.completed") as WebhookEvent;
        await dispatchWebhook({
          event,
          workspaceId: ctx.workspaceId,
          data: { test: true, message: "This is a FHIRfix test event." },
        });
        return { dispatched: true, event };
      }),
  }),

  requestLogs: router({
    // the in-dashboard REST traffic log, newest first, cursor-paginated. this is
    // the traffic a developer debugging an integration needs - it includes calls
    // that never made a run (401/402/422/429), not just successful runs. filters:
    // method, statusCode, and a "onlyErrors" toggle (status >= 400).
    list: workspaceProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          method: z.string().optional(),
          statusCode: z.number().int().optional(),
          onlyErrors: z.boolean().optional(),
          cursor: z.string().optional(), // ISO createdAt of the last row seen
          limit: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(async ({ ctx, input }) => {
        const conditions = [eq(schema.apiRequestLog.workspaceId, ctx.workspaceId)];
        if (input.method) conditions.push(eq(schema.apiRequestLog.method, input.method));
        if (input.statusCode != null) {
          conditions.push(eq(schema.apiRequestLog.statusCode, input.statusCode));
        }
        if (input.onlyErrors) conditions.push(gte(schema.apiRequestLog.statusCode, 400));
        if (input.cursor) {
          conditions.push(lte(schema.apiRequestLog.createdAt, new Date(input.cursor)));
        }

        const rows = await ctx.db
          .select({
            id: schema.apiRequestLog.id,
            method: schema.apiRequestLog.method,
            path: schema.apiRequestLog.path,
            statusCode: schema.apiRequestLog.statusCode,
            latencyMs: schema.apiRequestLog.latencyMs,
            requestBytes: schema.apiRequestLog.requestBytes,
            responseBytes: schema.apiRequestLog.responseBytes,
            idempotencyKey: schema.apiRequestLog.idempotencyKey,
            runId: schema.apiRequestLog.runId,
            apiKeyId: schema.apiRequestLog.apiKeyId,
            errorCode: schema.apiRequestLog.errorCode,
            ip: schema.apiRequestLog.ip,
            createdAt: schema.apiRequestLog.createdAt,
          })
          .from(schema.apiRequestLog)
          .where(and(...conditions))
          .orderBy(desc(schema.apiRequestLog.createdAt))
          .limit(input.limit + 1);

        const hasMore = rows.length > input.limit;
        const page = hasMore ? rows.slice(0, input.limit) : rows;
        const nextCursor = hasMore
          ? (page[page.length - 1]?.createdAt?.toISOString() ?? null)
          : null;
        return { logs: page, nextCursor, hasMore };
      }),
  }),
});
