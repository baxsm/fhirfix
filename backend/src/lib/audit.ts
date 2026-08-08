import type { AuditAction } from "@shared/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { db, schema } from "./db";
import { createId } from "./id";

// first entry in x-forwarded-for is the client; the rest are proxies.
export function ipFromHeaders(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for") ?? headers.get("x-real-ip");
  return fwd?.split(",")[0]?.trim() || null;
}

// a login is unscoped, so it is recorded against every workspace the user belongs to
export async function recordLogin(args: { userId: string; ip: string | null }): Promise<void> {
  try {
    const memberships = await db
      .select({ workspaceId: schema.member.organizationId })
      .from(schema.member)
      .where(eq(schema.member.userId, args.userId));

    for (const { workspaceId } of memberships) {
      await writeAudit({
        workspaceId,
        action: "login",
        actorType: "user",
        actorId: args.userId,
        ip: args.ip,
      });
    }
  } catch (error) {
    logger.error("audit.recordLogin", error);
  }
}

type AuditInput = {
  workspaceId: string;
  action: AuditAction;
  actorType: "user" | "api_key" | "system";
  actorId?: string | null;
  targetRef?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown>;
};

// picking insert off the db keeps a transaction handle assignable too
type AuditWriter = Pick<typeof db, "insert">;

// must never throw into the caller: a lost audit row cannot fail the user's action
export async function writeAudit(entry: AuditInput, tx?: AuditWriter): Promise<void> {
  try {
    await (tx ?? db).insert(schema.auditLogEntry).values({
      id: createId("audit"),
      workspaceId: entry.workspaceId,
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      targetRef: entry.targetRef ?? null,
      ip: entry.ip ?? null,
      metadata: entry.metadata,
    });
  } catch (error) {
    logger.error("audit.write", error);
  }
}
