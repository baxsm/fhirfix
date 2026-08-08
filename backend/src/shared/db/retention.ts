import { and, isNotNull, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";

export type SweepResult = { scanned: number; purged: number };

// nulls the bytes but keeps the row: an auditor must still see it was purged
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
    // deletedAt is the tombstone; uploadState describes the upload, not the lifecycle
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

// counts what is due without deleting it
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
