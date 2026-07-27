import { boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const storedObject = pgTable(
  "stored_object",
  {
    key: text("key").primaryKey(), // object-storage key
    workspaceId: text("workspace_id").notNull(),
    bucket: text("bucket").notNull(),
    kind: text("kind", {
      enum: ["input", "corrected", "evidence", "signed_pdf", "export"],
    }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    contentType: text("content_type").notNull(),
    sha256: text("sha256").notNull(),
    content: text("content"),
    encrypted: boolean("encrypted").notNull().default(true),
    containsPhi: boolean("contains_phi").notNull().default(false),
    uploadState: text("upload_state", { enum: ["pending", "stored", "failed"] })
      .notNull()
      .default("pending"),
    retentionExpiresAt: timestamp("retention_expires_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }), // set by hard-delete job
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byExpiry: index("stored_object_expiry_idx").on(t.retentionExpiresAt),
  }),
);

export type StoredObject = typeof storedObject.$inferSelect;
export type NewStoredObject = typeof storedObject.$inferInsert;
