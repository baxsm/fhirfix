import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// mirrors MatrixCell in engine/src/conformance.ts; db must not depend on engine
export interface StoredMatrixCell {
  requirementId: string;
  requirement: string;
  conformance: string;
  igIdentifier: string;
  testKit: "plan_net" | "pdex" | "pas" | "crd" | "dtr";
  result: "pass" | "fail" | "skip" | "omit" | "error" | "running" | "wait" | "cancel";
  testIds: string[];
  message?: string;
}

export const conformancePacketRun = pgTable(
  "conformance_packet_run",
  {
    id: text("id").primaryKey(), // pkt_...
    workspaceId: text("workspace_id").notNull(),
    actorId: text("actor_id").notNull(),
    testKits: jsonb("test_kits").$type<string[]>().notNull().default([]),
    igVersions: jsonb("ig_versions").$type<Record<string, string>>().notNull().default({}),
    infernoVersion: text("inferno_version").notNull(),
    targetEndpoint: text("target_endpoint").notNull(),
    // pointer into encrypted_secret, never the oauth client_secret itself
    authConfigRef: text("auth_config_ref"),
    status: text("status", {
      enum: ["queued", "running", "completed", "failed", "cancelled"],
    })
      .notNull()
      .default("queued"),
    resultsMatrix: jsonb("results_matrix").$type<StoredMatrixCell[]>(),
    // per-suite counts keyed by inferno suite id, written as each suite finishes
    progress: jsonb("progress")
      .$type<Record<string, { total: number; completed: number; status: string }>>()
      .notNull()
      .default({}),
    overallResult: text("overall_result", { enum: ["pass", "fail", "partial"] }),
    passCount: integer("pass_count"),
    failCount: integer("fail_count"),
    previousRunId: text("previous_run_id"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index("conformance_packet_run_workspace_idx").on(t.workspaceId, t.createdAt),
  }),
);

// append-only: an auditor re-downloading months later must get identical bytes
export const evidenceBundle = pgTable(
  "evidence_bundle",
  {
    id: text("id").primaryKey(), // evb_...
    packetRunId: text("packet_run_id").notNull().unique(),
    workspaceId: text("workspace_id").notNull(),
    bundleRef: text("bundle_ref").notNull(),
    sha256: text("sha256").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    signedPdfRef: text("signed_pdf_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byWorkspace: index("evidence_bundle_workspace_idx").on(t.workspaceId, t.createdAt),
  }),
);

export const encryptedSecret = pgTable("encrypted_secret", {
  id: text("id").primaryKey(), // sec_...
  workspaceId: text("workspace_id").notNull(),
  ciphertext: text("ciphertext").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ConformancePacketRun = typeof conformancePacketRun.$inferSelect;
export type NewConformancePacketRun = typeof conformancePacketRun.$inferInsert;
export type EvidenceBundle = typeof evidenceBundle.$inferSelect;
export type NewEvidenceBundle = typeof evidenceBundle.$inferInsert;
export type EncryptedSecret = typeof encryptedSecret.$inferSelect;
