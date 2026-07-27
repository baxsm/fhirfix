import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const run = pgTable(
  "run",
  {
    id: text("id").primaryKey(), // run_...
    workspaceId: text("workspace_id").notNull(),
    actorType: text("actor_type", {
      enum: ["user", "api_key", "scheduled", "system"],
    }).notNull(),
    actorId: text("actor_id"), // user.id or api_key.id or scheduled_check.id
    source: text("source", { enum: ["ui", "api", "scheduled", "ci"] }).notNull(),
    inputType: text("input_type", {
      enum: ["hl7v2", "fhir_json", "fhir_xml", "ndjson", "bundle", "zip"],
    }).notNull(),
    fhirVersion: text("fhir_version", { enum: ["R4", "R4B", "R5"] }),
    profilesRequested: jsonb("profiles_requested")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    profilesApplied: jsonb("profiles_applied")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    terminologyServer: text("terminology_server"),
    engineVersion: text("engine_version").notNull(),
    igVersions: jsonb("ig_versions")
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed"],
    })
      .notNull()
      .default("queued"),
    resourceCount: integer("resource_count").notNull().default(0),
    conformanceScoreBefore: integer("conformance_score_before"), // 0-1000
    conformanceScoreAfter: integer("conformance_score_after"),
    autoFixApplied: boolean("auto_fix_applied").notNull().default(false),
    findingsTotal: integer("findings_total").notNull().default(0),
    findingsAutoFixable: integer("findings_auto_fixable").notNull().default(0),
    creditsCharged: integer("credits_charged").notNull().default(0), // micro-credits
    idempotencyKey: text("idempotency_key"),
    requestHash: text("request_hash"), // sha256 of body; same key + different hash => 409
    attempts: integer("attempts").notNull().default(0),
    inputRef: text("input_ref"), // -> stored_object.key; null when redaction=required
    correctedRef: text("corrected_ref"),
    retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    byWorkspace: index("run_workspace_idx").on(t.workspaceId, t.createdAt),
    byIdem: uniqueIndex("run_idem_idx").on(t.workspaceId, t.idempotencyKey),
  }),
);

export const finding = pgTable(
  "finding",
  {
    id: text("id").primaryKey(), // fnd_...
    runId: text("run_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    severity: text("severity", { enum: ["error", "warning", "info"] }).notNull(),
    category: text("category", {
      enum: [
        "structural",
        "profile",
        "terminology",
        "cardinality",
        "invariant",
        "reference",
        "must_support",
      ],
    }).notNull(),
    ruleSource: text("rule_source").notNull(), // IG + rule id, shown de-emphasized
    specCitation: text("spec_citation").notNull(),
    resourceType: text("resource_type"),
    fhirpath: text("fhirpath"),
    rawValidatorMessage: text("raw_validator_message").notNull(),
    plainMessage: text("plain_message").notNull(),
    suggestedFix: text("suggested_fix").notNull(),
    fixConfidence: text("fix_confidence", {
      enum: ["auto", "one_click", "manual"],
    }).notNull(),
    fixStatus: text("fix_status", {
      enum: ["applied", "suggested", "skipped", "manual_needed", "dismissed"],
    })
      .notNull()
      .default("suggested"),
    dismissedBy: text("dismissed_by"),
    dedupFingerprint: text("dedup_fingerprint").notNull(),
    occurrenceCount: integer("occurrence_count").notNull().default(1),
    rank: integer("rank").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byRun: index("finding_run_idx").on(t.runId, t.rank),
    byFingerprint: index("finding_fingerprint_idx").on(t.workspaceId, t.dedupFingerprint),
  }),
);

export const reportShare = pgTable(
  "report_share",
  {
    token: text("token").primaryKey(), // shr_...
    runId: text("run_id").notNull(),
    workspaceId: text("workspace_id").notNull(),
    createdBy: text("created_by").notNull(), // user.id
    redacted: boolean("redacted").notNull().default(false), // corrected copy was PHI-safe
    viewCount: integer("view_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byRun: index("report_share_run_idx").on(t.runId),
  }),
);

export type Run = typeof run.$inferSelect;
export type NewRun = typeof run.$inferInsert;
export type Finding = typeof finding.$inferSelect;
export type NewFinding = typeof finding.$inferInsert;
export type ReportShare = typeof reportShare.$inferSelect;
export type NewReportShare = typeof reportShare.$inferInsert;
