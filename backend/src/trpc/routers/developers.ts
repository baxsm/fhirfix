import { listEndpointsForEvent, type WebhookEvent } from "@shared/db/webhooks";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { generateKey } from "@/lib/api-key";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { encryptSecret, generateWebhookSecret } from "@/lib/secret-crypto";
import { dispatchWebhook } from "@/queues/index";
import { router, workspaceProcedure } from "../trpc";

// the scopes a key can hold. mappings write needs the admin-only mapping scope.
const KEY_SCOPES = ["validate", "convert", "fix", "runs", "mappings"] as const;

// the events a webhook endpoint can subscribe to (phase 5 subset of the enum).
const WEBHOOK_EVENTS = [
  "run.completed",
  "run.failed",
  "batch.completed",
  "credits.low",
  "drift.detected",
  "conformance.completed",
] as const;

function requireKeyPermission(role: string, action: "create" | "revoke") {
  if (!hasPermission(role as never, "apiKey", action)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage API keys." });
  }
}

function requireWebhookPermission(role: string) {
  if (!hasPermission(role as never, "apiKey", "create")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage webhooks." });
  }
}

export const developersRouter = router({
  apiKeys: router({
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
        await writeAudit({
          workspaceId: ctx.workspaceId,
          action: "key.created",
          actorType: "user",
          actorId: ctx.user.id,
          targetRef: id,
          ip: ipFromHeaders(ctx.headers),
          metadata: { name: input.name, mode: input.mode, scopes: input.scopes },
        });
        return { id, name: input.name, mode: input.mode, prefix, key: full };
      }),

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
        await writeAudit({
          workspaceId: ctx.workspaceId,
          action: "key.revoked",
          actorType: "user",
          actorId: ctx.user.id,
          targetRef: input.keyId,
          ip: ipFromHeaders(ctx.headers),
        });
        return { revoked: true };
      }),
  }),

  webhooks: router({
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
        await writeAudit({
          workspaceId: ctx.workspaceId,
          action: "webhook.created",
          actorType: "user",
          actorId: ctx.user.id,
          targetRef: id,
          ip: ipFromHeaders(ctx.headers),
          metadata: { url: input.url, events: input.events },
        });
        return { id, url: input.url, events: input.events, secret };
      }),

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
        await writeAudit({
          workspaceId: ctx.workspaceId,
          action: "webhook.secret_rotated",
          actorType: "user",
          actorId: ctx.user.id,
          targetRef: input.id,
          ip: ipFromHeaders(ctx.headers),
        });
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
        await writeAudit({
          workspaceId: ctx.workspaceId,
          action: "webhook.deleted",
          actorType: "user",
          actorId: ctx.user.id,
          targetRef: input.id,
          ip: ipFromHeaders(ctx.headers),
        });
        return { deleted: true };
      }),

    testPing: workspaceProcedure
      .input(z.object({ workspaceId: z.string(), event: z.enum(WEBHOOK_EVENTS).optional() }))
      .mutation(async ({ ctx, input }) => {
        requireWebhookPermission(ctx.role);
        const event = (input.event ?? "run.completed") as WebhookEvent;
        // the fan-out filters by subscription, so an unsubscribed event reaches nothing
        const targets = await listEndpointsForEvent(ctx.db, ctx.workspaceId, event);
        if (targets.length > 0) {
          await dispatchWebhook({
            event,
            workspaceId: ctx.workspaceId,
            data: { test: true, message: "This is a FHIRfix test event." },
          });
        }
        return { dispatched: targets.length > 0, event, delivered: targets.length };
      }),
  }),

  requestLogs: router({
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

    stats: workspaceProcedure.query(async ({ ctx }) => {
      const DAY_MS = 24 * 60 * 60 * 1000;
      const [recent] = await ctx.db
        .select({ latest: sql<string | null>`max(${schema.apiRequestLog.createdAt})` })
        .from(schema.apiRequestLog)
        .where(eq(schema.apiRequestLog.workspaceId, ctx.workspaceId));

      const latest = recent?.latest ? new Date(recent.latest) : null;
      const now = Date.now();
      const spanMs =
        latest && now - latest.getTime() > DAY_MS
          ? Math.ceil((now - latest.getTime()) / DAY_MS) * DAY_MS
          : DAY_MS;
      const since = new Date(now - spanMs);
      const scope = and(
        eq(schema.apiRequestLog.workspaceId, ctx.workspaceId),
        gte(schema.apiRequestLog.createdAt, since),
      );

      const [totals] = await ctx.db
        .select({
          total: sql<number>`count(*)`,
          errors: sql<number>`count(*) filter (where ${schema.apiRequestLog.statusCode} >= 400)`,
          p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${schema.apiRequestLog.latencyMs}), 0)`,
        })
        .from(schema.apiRequestLog)
        .where(scope);

      const topPaths = await ctx.db
        .select({
          path: schema.apiRequestLog.path,
          count: sql<number>`count(*)`,
          errors: sql<number>`count(*) filter (where ${schema.apiRequestLog.statusCode} >= 400)`,
        })
        .from(schema.apiRequestLog)
        .where(scope)
        .groupBy(schema.apiRequestLog.path)
        .orderBy(desc(sql`count(*)`))
        .limit(5);

      return {
        windowHours: Math.round(spanMs / (60 * 60 * 1000)),
        total: Number(totals?.total ?? 0),
        errors: Number(totals?.errors ?? 0),
        p95Ms: Math.round(Number(totals?.p95 ?? 0)),
        topPaths: topPaths.map((p) => ({
          path: p.path,
          count: Number(p.count),
          errors: Number(p.errors),
        })),
      };
    }),
  }),
});
