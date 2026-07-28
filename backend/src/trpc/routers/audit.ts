import type { Db } from "@shared/db/client";
import { AUDIT_ACTIONS } from "@shared/db/schema";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { z } from "zod";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { schema } from "@/lib/db";
import { enforceRole, router } from "../trpc";

// read-only by design. the table is append-only, so there is no update or delete
// procedure here and there must never be one.
const auditView = enforceRole("audit", "view");

const listInput = z.object({
  workspaceId: z.string(),
  action: z.enum(AUDIT_ACTIONS).optional(),
  actorId: z.string().optional(),
  since: z.string().optional(), // ISO
  cursor: z.string().optional(), // ISO createdAt of the last row seen
  limit: z.number().int().min(1).max(100).default(25),
});

function conditionsFor(
  workspaceId: string,
  input: { action?: string; actorId?: string; since?: string; cursor?: string },
) {
  const conditions = [eq(schema.auditLogEntry.workspaceId, workspaceId)];
  if (input.action) {
    conditions.push(eq(schema.auditLogEntry.action, input.action as never));
  }
  if (input.actorId) conditions.push(eq(schema.auditLogEntry.actorId, input.actorId));
  if (input.since) conditions.push(gte(schema.auditLogEntry.createdAt, new Date(input.since)));
  if (input.cursor) conditions.push(lte(schema.auditLogEntry.createdAt, new Date(input.cursor)));
  return conditions;
}

const columns = {
  id: schema.auditLogEntry.id,
  action: schema.auditLogEntry.action,
  actorType: schema.auditLogEntry.actorType,
  actorId: schema.auditLogEntry.actorId,
  targetRef: schema.auditLogEntry.targetRef,
  ip: schema.auditLogEntry.ip,
  metadata: schema.auditLogEntry.metadata,
  createdAt: schema.auditLogEntry.createdAt,
};

// an actor id is opaque to the person reading the log, so resolve user actors to
// a name/email. api-key actors resolve to the key name.
async function withActorNames<T extends { actorType: string; actorId: string | null }>(
  db: Db,
  rows: T[],
): Promise<(T & { actorName: string | null })[]> {
  const idsFor = (type: string) => [
    ...new Set(rows.filter((r) => r.actorType === type && r.actorId).map((r) => r.actorId as string)),
  ];
  const userIds = idsFor("user");
  const keyIds = idsFor("api_key");

  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const users = await db
      .select({ id: schema.user.id, name: schema.user.name, email: schema.user.email })
      .from(schema.user)
      .where(inArray(schema.user.id, userIds));
    for (const u of users) names.set(u.id, u.name || u.email);
  }
  if (keyIds.length > 0) {
    const keys = await db
      .select({ id: schema.apiKey.id, name: schema.apiKey.name })
      .from(schema.apiKey)
      .where(inArray(schema.apiKey.id, keyIds));
    for (const k of keys) names.set(k.id, k.name);
  }

  return rows.map((r) => ({
    ...r,
    actorName: r.actorId ? (names.get(r.actorId) ?? null) : null,
  }));
}

export const auditRouter = router({
  list: auditView.input(listInput).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select(columns)
      .from(schema.auditLogEntry)
      .where(and(...conditionsFor(ctx.workspaceId, input)))
      .orderBy(desc(schema.auditLogEntry.createdAt))
      .limit(input.limit + 1);

    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    const nextCursor = hasMore ? (page[page.length - 1]?.createdAt?.toISOString() ?? null) : null;
    return { entries: await withActorNames(ctx.db, page), nextCursor, hasMore };
  }),

  // the distinct actions actually present, so the filter offers only real options
  // instead of all 29 enum members on a workspace that has used five of them.
  actions: auditView.query(async ({ ctx }) => {
    const rows = await ctx.db
      .selectDistinct({ action: schema.auditLogEntry.action })
      .from(schema.auditLogEntry)
      .where(eq(schema.auditLogEntry.workspaceId, ctx.workspaceId));
    return rows.map((r) => r.action).sort();
  }),

  exportCsv: auditView
    .input(listInput.omit({ cursor: true, limit: true }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select(columns)
        .from(schema.auditLogEntry)
        .where(and(...conditionsFor(ctx.workspaceId, input)))
        .orderBy(desc(schema.auditLogEntry.createdAt))
        .limit(10000);
      // exporting the audit log is itself an auditable export.
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "data.exported",
        actorType: "user",
        actorId: ctx.user.id,
        ip: ipFromHeaders(ctx.headers),
        metadata: { kind: "audit_log", rows: rows.length },
      });
      return withActorNames(ctx.db, rows);
    }),
});
