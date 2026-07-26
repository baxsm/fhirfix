import { describeCron, isValidCron } from "@shared/db/cron";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { encryptSecret } from "@/lib/secret-crypto";
import { registerSchedule, scheduleQueue, unregisterSchedule } from "@/queues/index";
import { router, workspaceProcedure } from "../trpc";

const TARGET_TYPES = ["endpoint", "source_url", "upload_folder"] as const;
const CHANNEL_TYPES = ["email", "slack", "webhook"] as const;
const DRIFT_TYPES = [
  "pass_rate_drop",
  "new_error_class",
  "unmapped_authority",
  "ig_version_change",
] as const;

function requireManage(role: string) {
  if (!hasPermission(role as never, "monitoring", "manage")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Your role cannot manage scheduled checks.",
    });
  }
}

const alertChannel = z.object({
  type: z.enum(CHANNEL_TYPES),
  target: z.string().min(1).max(500),
});

// the shape shared by create and update. cron is validated here rather than in
// the scheduler, so a bad expression is refused at the boundary instead of
// silently registering a timer that never fires.
const checkFields = z.object({
  name: z.string().min(1).max(120),
  scheduleCron: z
    .string()
    .min(1)
    .max(120)
    .refine(isValidCron, "Not a valid cron expression (5 fields, e.g. 0 */6 * * *)."),
  targetType: z.enum(TARGET_TYPES),
  targetRef: z.string().min(1).max(2000),
  profiles: z.array(z.string().max(300)).max(20).default([]),
  registryScope: z.string().max(200).nullable().default(null),
  baselineConfig: z
    .object({
      minPassRate: z.number().min(0).max(100).optional(),
      maxErrorDelta: z.number().int().min(0).max(10_000).optional(),
    })
    .nullable()
    .default(null),
  alertChannels: z.array(alertChannel).max(10).default([]),
  enabled: z.boolean().default(true),
});

// an http target must actually be http. without this a check could be pointed at
// file:// or a private scheme and the fetch failure would only surface a run later.
function validateTarget(targetType: (typeof TARGET_TYPES)[number], targetRef: string) {
  if (targetType === "upload_folder") return;
  let url: URL;
  try {
    url = new URL(targetRef);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Target must be a valid URL." });
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Target must be an http or https URL." });
  }
}

// slack and webhook targets are secret-bearing urls, so they are encrypted at
// rest per the schema rules. email targets go through the same path so the
// storage shape is uniform rather than branching per channel.
function encryptChannels(channels: Array<{ type: string; target: string }>) {
  return channels.map((c) => ({
    type: c.type as (typeof CHANNEL_TYPES)[number],
    target: encryptSecret(c.target),
  }));
}

export const monitoringRouter = router({
  // scheduled checks in the workspace, newest first, with their latest run status.
  listChecks: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          id: schema.scheduledCheck.id,
          name: schema.scheduledCheck.name,
          scheduleCron: schema.scheduledCheck.scheduleCron,
          targetType: schema.scheduledCheck.targetType,
          targetRef: schema.scheduledCheck.targetRef,
          profiles: schema.scheduledCheck.profiles,
          registryScope: schema.scheduledCheck.registryScope,
          baselineConfig: schema.scheduledCheck.baselineConfig,
          enabled: schema.scheduledCheck.enabled,
          lastRunId: schema.scheduledCheck.lastRunId,
          lastRunAt: schema.scheduledCheck.lastRunAt,
          lastError: schema.scheduledCheck.lastError,
          createdAt: schema.scheduledCheck.createdAt,
          // channel targets are encrypted; the ui only needs to know which
          // channels exist, never the secret url behind them.
          channelTypes: sql<
            string[]
          >`coalesce((select array_agg(c->>'type') from jsonb_array_elements(${schema.scheduledCheck.alertChannels}) c), '{}')`,
        })
        .from(schema.scheduledCheck)
        .where(eq(schema.scheduledCheck.workspaceId, ctx.workspaceId))
        .orderBy(desc(schema.scheduledCheck.createdAt))
        .limit(200);

      return rows.map((r) => ({ ...r, scheduleLabel: describeCron(r.scheduleCron) }));
    }),

  createCheck: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }).extend(checkFields.shape))
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);
      validateTarget(input.targetType, input.targetRef);

      const id = createId("scheduledCheck");
      await ctx.db.insert(schema.scheduledCheck).values({
        id,
        workspaceId: ctx.workspaceId,
        name: input.name,
        scheduleCron: input.scheduleCron,
        targetType: input.targetType,
        targetRef: input.targetRef,
        profiles: input.profiles,
        registryScope: input.registryScope,
        baselineConfig: input.baselineConfig,
        alertChannels: encryptChannels(input.alertChannels),
        enabled: input.enabled,
        createdBy: ctx.user.id,
      });

      // register only when enabled, so a check created switched-off does not fire.
      if (input.enabled) {
        await registerSchedule(id, input.scheduleCron);
      }

      logger.info("schedule.created", `${id} in ${ctx.workspaceId} by ${ctx.user.id}`);
      return { id };
    }),

  updateCheck: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), id: z.string() }).extend(checkFields.shape))
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);
      validateTarget(input.targetType, input.targetRef);

      const updated = await ctx.db
        .update(schema.scheduledCheck)
        .set({
          name: input.name,
          scheduleCron: input.scheduleCron,
          targetType: input.targetType,
          targetRef: input.targetRef,
          profiles: input.profiles,
          registryScope: input.registryScope,
          baselineConfig: input.baselineConfig,
          alertChannels: encryptChannels(input.alertChannels),
          enabled: input.enabled,
        })
        .where(
          and(
            eq(schema.scheduledCheck.id, input.id),
            eq(schema.scheduledCheck.workspaceId, ctx.workspaceId),
          ),
        )
        .returning({ id: schema.scheduledCheck.id });

      if (updated.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scheduled check not found." });
      }

      // the cron may have changed, so the scheduler is re-registered rather than
      // left pointing at the old pattern.
      if (input.enabled) {
        await registerSchedule(input.id, input.scheduleCron);
      } else {
        await unregisterSchedule(input.id);
      }

      logger.info("schedule.updated", `${input.id} in ${ctx.workspaceId} by ${ctx.user.id}`);
      return { id: input.id };
    }),

  setEnabled: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), id: z.string(), enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);

      const [row] = await ctx.db
        .update(schema.scheduledCheck)
        .set({ enabled: input.enabled })
        .where(
          and(
            eq(schema.scheduledCheck.id, input.id),
            eq(schema.scheduledCheck.workspaceId, ctx.workspaceId),
          ),
        )
        .returning({
          id: schema.scheduledCheck.id,
          scheduleCron: schema.scheduledCheck.scheduleCron,
        });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scheduled check not found." });
      }

      if (input.enabled) {
        await registerSchedule(row.id, row.scheduleCron);
      } else {
        await unregisterSchedule(row.id);
      }

      logger.info("schedule.enabled", `${input.id} -> ${input.enabled}`);
      return { enabled: input.enabled };
    }),

  deleteCheck: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);

      const deleted = await ctx.db
        .delete(schema.scheduledCheck)
        .where(
          and(
            eq(schema.scheduledCheck.id, input.id),
            eq(schema.scheduledCheck.workspaceId, ctx.workspaceId),
          ),
        )
        .returning({ id: schema.scheduledCheck.id });

      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scheduled check not found." });
      }

      // drop the timer too, or it fires forever against a check that is gone.
      await unregisterSchedule(input.id);

      logger.info("schedule.deleted", `${input.id} in ${ctx.workspaceId} by ${ctx.user.id}`);
      return { deleted: true };
    }),

  // fire a check immediately, without waiting for its cron. the job is identical
  // to a scheduled firing, so what this proves is exactly what the schedule does.
  runNow: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);

      const [check] = await ctx.db
        .select({ id: schema.scheduledCheck.id })
        .from(schema.scheduledCheck)
        .where(
          and(
            eq(schema.scheduledCheck.id, input.id),
            eq(schema.scheduledCheck.workspaceId, ctx.workspaceId),
          ),
        )
        .limit(1);

      if (!check) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scheduled check not found." });
      }

      await scheduleQueue.add(
        "fire",
        { scheduledCheckId: check.id },
        { removeOnComplete: 100, removeOnFail: 500 },
      );

      logger.info("schedule.runNow", `${check.id} by ${ctx.user.id}`);
      return { queued: true };
    }),

  // the drift feed. `unacknowledgedOnly` is the default view, because an
  // acknowledged alert is history rather than something needing attention.
  listAlerts: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        scheduledCheckId: z.string().optional(),
        type: z.enum(DRIFT_TYPES).optional(),
        unacknowledgedOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.driftAlert.workspaceId, ctx.workspaceId)];
      if (input.scheduledCheckId) {
        conditions.push(eq(schema.driftAlert.scheduledCheckId, input.scheduledCheckId));
      }
      if (input.type) {
        conditions.push(eq(schema.driftAlert.type, input.type));
      }
      if (input.unacknowledgedOnly) {
        conditions.push(isNull(schema.driftAlert.acknowledgedAt));
      }

      return ctx.db
        .select({
          id: schema.driftAlert.id,
          scheduledCheckId: schema.driftAlert.scheduledCheckId,
          checkName: schema.scheduledCheck.name,
          runId: schema.driftAlert.runId,
          type: schema.driftAlert.type,
          severity: schema.driftAlert.severity,
          metricBefore: schema.driftAlert.metricBefore,
          metricAfter: schema.driftAlert.metricAfter,
          detail: schema.driftAlert.detail,
          acknowledgedBy: schema.driftAlert.acknowledgedBy,
          acknowledgedAt: schema.driftAlert.acknowledgedAt,
          createdAt: schema.driftAlert.createdAt,
        })
        .from(schema.driftAlert)
        .leftJoin(
          schema.scheduledCheck,
          eq(schema.driftAlert.scheduledCheckId, schema.scheduledCheck.id),
        )
        .where(and(...conditions))
        .orderBy(desc(schema.driftAlert.createdAt))
        .limit(200);
    }),

  // counts for the header strip. one query rather than filtering the list client
  // side, so the numbers stay right when the list is capped at 200.
  alertCounts: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          severity: schema.driftAlert.severity,
          total: sql<number>`count(*)::int`,
          open: sql<number>`count(*) filter (where ${schema.driftAlert.acknowledgedAt} is null)::int`,
        })
        .from(schema.driftAlert)
        .where(eq(schema.driftAlert.workspaceId, ctx.workspaceId))
        .groupBy(schema.driftAlert.severity);

      const counts = { total: 0, open: 0, error: 0, warning: 0, info: 0 };
      for (const row of rows) {
        counts.total += row.total;
        counts.open += row.open;
        counts[row.severity] = row.total;
      }
      return counts;
    }),

  acknowledgeAlert: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireManage(ctx.role);

      const acked = await ctx.db
        .update(schema.driftAlert)
        .set({ acknowledgedBy: ctx.user.id, acknowledgedAt: new Date() })
        .where(
          and(
            eq(schema.driftAlert.id, input.id),
            eq(schema.driftAlert.workspaceId, ctx.workspaceId),
            isNull(schema.driftAlert.acknowledgedAt),
          ),
        )
        .returning({ id: schema.driftAlert.id });

      if (acked.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Alert not found, or it was already acknowledged.",
        });
      }

      return { acknowledged: true };
    }),
});
