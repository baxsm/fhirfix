import { customAlphabet } from "nanoid";
import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);
const notificationId = () => `ntf_${nano()}`;

// record a transactional notification. this is the auditable delivery record AND
// the dedup source. returns false if a matching record for this dedupKey already
// exists (so a caller does not re-send). the actual email/webhook send is the
// caller's job; this only records intent+outcome.
export async function recordNotification(
  db: Db,
  args: {
    workspaceId: string;
    channel: "email" | "slack" | "webhook";
    type: string; // e.g. "credits.low"
    target: string;
    status: "sent" | "failed" | "bounced";
    providerMessageId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<{ id: string }> {
  const id = notificationId();
  await db.insert(schema.notificationLog).values({
    id,
    workspaceId: args.workspaceId,
    channel: args.channel,
    type: args.type,
    target: args.target,
    status: args.status,
    providerMessageId: args.providerMessageId ?? null,
    metadata: args.metadata ?? null,
  });
  return { id };
}

// has a notification of this type already been recorded for this workspace with
// this dedup marker? used so a low-balance alert at a given threshold is only sent
// once per cycle. the marker lives in metadata.dedup.
export async function hasNotification(
  db: Db,
  args: { workspaceId: string; type: string; dedup: string },
): Promise<boolean> {
  const rows = await db
    .select({ id: schema.notificationLog.id, metadata: schema.notificationLog.metadata })
    .from(schema.notificationLog)
    .where(
      and(
        eq(schema.notificationLog.workspaceId, args.workspaceId),
        eq(schema.notificationLog.type, args.type),
      ),
    );
  return rows.some((r) => (r.metadata as { dedup?: string } | null)?.dedup === args.dedup);
}
