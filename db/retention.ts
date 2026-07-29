import { and, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";

export type SweepResult = { scanned: number; purged: number };

// hard-delete the BYTES of expired artifacts, keeping the tracking row.
//
// the row stays because it is the record that something existed and was
// disposed of - an auditor asking "what happened to run X's input" gets
// "purged on this date", not a missing row. `content` is nulled, which is the
// actual deletion: blobs live in postgres (see blob.ts), not on a disk.
export async function sweepExpiredBlobs(db: Db, now = new Date()): Promise<SweepResult> {
  const expired = await db
    .select({ key: schema.storedObject.key })
    .from(schema.storedObject)
    .where(
      and(
        isNotNull(schema.storedObject.retentionExpiresAt),
        lte(schema.storedObject.retentionExpiresAt, now),
        // already purged rows keep their deletedAt and are skipped.
        isNull(schema.storedObject.deletedAt),
        isNotNull(schema.storedObject.content),
      ),
    )
    .limit(1000);

  if (expired.length === 0) return { scanned: 0, purged: 0 };

  const result = await db
    .update(schema.storedObject)
    // deletedAt IS the tombstone. uploadState describes the upload, not the
    // lifecycle, and has no "deleted" member.
    .set({ content: null, deletedAt: now })
    .where(
      and(
        isNotNull(schema.storedObject.retentionExpiresAt),
        lte(schema.storedObject.retentionExpiresAt, now),
        isNull(schema.storedObject.deletedAt),
        isNotNull(schema.storedObject.content),
      ),
    )
    .returning({ key: schema.storedObject.key });

  return { scanned: expired.length, purged: result.length };
}

// how many artifacts are due, without deleting anything. used by tests and by
// an operator checking the job is keeping up.
export async function countExpiredBlobs(db: Db, now = new Date()): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.storedObject)
    .where(
      and(
        isNotNull(schema.storedObject.retentionExpiresAt),
        lte(schema.storedObject.retentionExpiresAt, now),
        isNull(schema.storedObject.deletedAt),
        isNotNull(schema.storedObject.content),
      ),
    );
  return Number(row?.n ?? 0);
}
