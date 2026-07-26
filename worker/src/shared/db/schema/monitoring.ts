import { boolean, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// a recurring check: cron -> fetch the target -> submit a run -> compare against
// baseline -> emit drift alerts. the durable definition; BullMQ holds the live
// schedule, rebuilt from these rows on worker boot so redis stays disposable.
export const scheduledCheck = pgTable(
  "scheduled_check",
  {
    id: text("id").primaryKey(), // sch_...
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    scheduleCron: text("schedule_cron").notNull(),
    targetType: text("target_type", {
      enum: ["endpoint", "source_url", "upload_folder"],
    }).notNull(),
    targetRef: text("target_ref").notNull(),
    profiles: jsonb("profiles")
      .$type<string[]>()
      .notNull()
      .default([]),
    registryScope: text("registry_scope"), // null = whole workspace registry
    baselineConfig: jsonb("baseline_config").$type<{
      minPassRate?: number; // 0-100, conformance score floor
      maxErrorDelta?: number; // allowed growth in error findings vs the last run
    }>(),
    // the slack/webhook target is a secret-bearing url, so `target` is stored
    // encrypted (sealed box) and only decrypted at send time. email targets are
    // encrypted too rather than branching per channel - one shape, one rule.
    alertChannels: jsonb("alert_channels")
      .$type<Array<{ type: "email" | "slack" | "webhook"; target: string }>>()
      .notNull()
      .default([]),
    enabled: boolean("enabled").notNull().default(true),
    lastRunId: text("last_run_id"),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    lastError: text("last_error"), // why the most recent fire produced no run
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index("scheduled_check_workspace_idx").on(t.workspaceId, t.createdAt),
  }),
);

// one detected regression on one scheduled run. append-only: acknowledging sets
// acknowledged_by/at rather than deleting, so the history stays auditable.
export const driftAlert = pgTable(
  "drift_alert",
  {
    id: text("id").primaryKey(), // drf_...
    workspaceId: text("workspace_id").notNull(),
    scheduledCheckId: text("scheduled_check_id").notNull(),
    runId: text("run_id"),
    type: text("type", {
      enum: ["pass_rate_drop", "new_error_class", "unmapped_authority", "ig_version_change"],
    }).notNull(),
    severity: text("severity", { enum: ["error", "warning", "info"] }).notNull(),
    // kept as text because the four types measure different things: a score for
    // pass_rate_drop, a rule id for new_error_class, an authority for
    // unmapped_authority, a version string for ig_version_change.
    metricBefore: text("metric_before"),
    metricAfter: text("metric_after"),
    detail: text("detail"), // one human-readable line, shown in the feed
    acknowledgedBy: text("acknowledged_by"),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index("drift_alert_workspace_idx").on(t.workspaceId, t.createdAt),
    byCheck: index("drift_alert_check_idx").on(t.scheduledCheckId, t.createdAt),
  }),
);

export type ScheduledCheck = typeof scheduledCheck.$inferSelect;
export type NewScheduledCheck = typeof scheduledCheck.$inferInsert;
export type DriftAlert = typeof driftAlert.$inferSelect;
export type NewDriftAlert = typeof driftAlert.$inferInsert;
