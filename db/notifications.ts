import { customAlphabet } from "nanoid";
import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);
const notificationId = () => `ntf_${nano()}`;

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
