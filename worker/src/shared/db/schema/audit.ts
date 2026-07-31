import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// the closed set of auditable actions. a new sensitive action adds a member here,
// which is what the audit-coverage test greps against. mutations AND read/side-effect
// actions (downloads, exports, shares, logins) both belong in this list.
export const AUDIT_ACTIONS = [
  "login",
  "run.created",
  "run.cancelled",
  "report.downloaded",
  "report.exported",
  "mapping.changed",
  "mapping.approved",
  "mapping.deprecated",
  "mapping.imported",
  "key.created",
  "key.revoked",
  "webhook.created",
  "webhook.secret_rotated",
  "webhook.deleted",
  "member.invited",
  "member.role_changed",
  "member.removed",
  "settings.changed",
  "billing.checkout_started",
  "billing.auto_recharge_changed",
  "billing.spend_cap_changed",
  "check.created",
  "check.changed",
  "check.deleted",
  "packet.launched",
  "packet.exported",
  "data.exported",
  "baa.requested",
  "sso.configured",
  "sso.removed",
  "scim.enabled",
  "scim.disabled",
  "workspace.deleted",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

// append-only. no update or delete paths in application code.
export const auditLogEntry = pgTable(
  "audit_log_entry",
  {
    id: text("id").primaryKey(), // aud_...
    workspaceId: text("workspace_id").notNull(),
    actorType: text("actor_type", { enum: ["user", "api_key", "system"] }).notNull(),
    actorId: text("actor_id"), // polymorphic (user / api_key / scheduled_check), so no FK
    action: text("action").$type<AuditAction>().notNull(),
    targetRef: text("target_ref"),
    ip: text("ip"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index("audit_workspace_idx").on(t.workspaceId, t.createdAt),
    byAction: index("audit_action_idx").on(t.workspaceId, t.action),
  }),
);

export type AuditLogEntry = typeof auditLogEntry.$inferSelect;
export type NewAuditLogEntry = typeof auditLogEntry.$inferInsert;
