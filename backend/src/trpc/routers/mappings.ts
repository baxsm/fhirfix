import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { findConflicts } from "@/lib/mapping-conflicts";
import { router, workspaceProcedure } from "../trpc";

// every write is versioned: an edit supersedes the old row, never mutates it

const MAPPING_TYPES = ["authority_to_system", "code_to_code", "facility_to_org", "custom"] as const;
const MAPPING_SCOPES = ["workspace", "source_system"] as const;

type MappingAction = "create" | "approve" | "deprecate";

function requireMappingPermission(role: string, action: MappingAction) {
  if (!hasPermission(role as never, "mapping", action)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage mappings." });
  }
}

// live rows only: a superseded row is history and must never show up as current.
const isLive = isNull(schema.mappingRegistryEntry.supersededById);

// one definition, used by both `list` and `counts`. if they diverge, a tab count
// stops matching the rows under it.
function searchFilter(search: string | undefined) {
  const term = search?.trim();
  if (!term) return undefined;
  const needle = `%${term.toLowerCase()}%`;
  return or(
    sql`lower(${schema.mappingRegistryEntry.sourceValue}) like ${needle}`,
    sql`lower(${schema.mappingRegistryEntry.targetValue}) like ${needle}`,
  );
}

const scopeFields = z.object({
  scope: z.enum(MAPPING_SCOPES).default("workspace"),
  sourceSystem: z.string().min(1).max(200).nullable().default(null),
});

// reject rather than silently normalize, so the caller learns which scope they meant
function normalizeScope(scope: "workspace" | "source_system", sourceSystem: string | null) {
  if (scope === "source_system" && !sourceSystem) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A source-system mapping needs a source system.",
    });
  }
  return { scope, sourceSystem: scope === "workspace" ? null : sourceSystem };
}

export const mappingsRouter = router({
  list: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        status: z.enum(["active", "suggested", "deprecated", "rejected"]).optional(),
        type: z.enum(MAPPING_TYPES).optional(),
        search: z.string().max(200).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId), isLive];
      if (input.status) {
        conditions.push(eq(schema.mappingRegistryEntry.status, input.status));
      }
      if (input.type) {
        conditions.push(eq(schema.mappingRegistryEntry.type, input.type));
      }
      const match = searchFilter(input.search);
      if (match) conditions.push(match);

      return ctx.db
        .select({
          id: schema.mappingRegistryEntry.id,
          scope: schema.mappingRegistryEntry.scope,
          sourceSystem: schema.mappingRegistryEntry.sourceSystem,
          type: schema.mappingRegistryEntry.type,
          sourceValue: schema.mappingRegistryEntry.sourceValue,
          targetValue: schema.mappingRegistryEntry.targetValue,
          targetSystem: schema.mappingRegistryEntry.targetSystem,
          status: schema.mappingRegistryEntry.status,
          confidence: schema.mappingRegistryEntry.confidence,
          version: schema.mappingRegistryEntry.version,
          supersedesId: schema.mappingRegistryEntry.supersedesId,
          createdBy: schema.mappingRegistryEntry.createdBy,
          approvedBy: schema.mappingRegistryEntry.approvedBy,
          createdAt: schema.mappingRegistryEntry.createdAt,
        })
        .from(schema.mappingRegistryEntry)
        .where(and(...conditions))
        .orderBy(desc(schema.mappingRegistryEntry.createdAt))
        .limit(500);
    }),

  // the live-unique index cannot catch these: scope is part of its key
  conflicts: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx }) => {
      const rows = await ctx.db
        .select({
          id: schema.mappingRegistryEntry.id,
          scope: schema.mappingRegistryEntry.scope,
          sourceSystem: schema.mappingRegistryEntry.sourceSystem,
          type: schema.mappingRegistryEntry.type,
          sourceValue: schema.mappingRegistryEntry.sourceValue,
          targetValue: schema.mappingRegistryEntry.targetValue,
        })
        .from(schema.mappingRegistryEntry)
        .where(
          and(
            eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
            eq(schema.mappingRegistryEntry.status, "active"),
            isLive,
          ),
        );

      return findConflicts(rows);
    }),

  // counts must honour the same search the list does, or a tab can read
  // "Rejected 1" above an empty result and look broken.
  counts: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId), isLive];
      const match = searchFilter(input.search);
      if (match) conditions.push(match);

      const rows = await ctx.db
        .select({
          status: schema.mappingRegistryEntry.status,
          count: sql<number>`count(*)::int`,
        })
        .from(schema.mappingRegistryEntry)
        .where(and(...conditions))
        .groupBy(schema.mappingRegistryEntry.status);

      const counts = { active: 0, suggested: 0, deprecated: 0, rejected: 0 };
      for (const r of rows) {
        counts[r.status] = r.count;
      }
      return counts;
    }),

  // the supersede chain for one mapping, oldest first
  history: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), mappingId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [start] = await ctx.db
        .select({
          sourceValue: schema.mappingRegistryEntry.sourceValue,
          type: schema.mappingRegistryEntry.type,
          scope: schema.mappingRegistryEntry.scope,
          sourceSystem: schema.mappingRegistryEntry.sourceSystem,
        })
        .from(schema.mappingRegistryEntry)
        .where(
          and(
            eq(schema.mappingRegistryEntry.id, input.mappingId),
            eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
          ),
        )
        .limit(1);
      if (!start) throw new TRPCError({ code: "NOT_FOUND", message: "Mapping not found." });

      // every version shares the identity tuple, so this returns the chain without recursing
      return ctx.db
        .select({
          id: schema.mappingRegistryEntry.id,
          version: schema.mappingRegistryEntry.version,
          targetValue: schema.mappingRegistryEntry.targetValue,
          targetSystem: schema.mappingRegistryEntry.targetSystem,
          status: schema.mappingRegistryEntry.status,
          supersedesId: schema.mappingRegistryEntry.supersedesId,
          supersededById: schema.mappingRegistryEntry.supersededById,
          createdBy: schema.mappingRegistryEntry.createdBy,
          approvedBy: schema.mappingRegistryEntry.approvedBy,
          createdAt: schema.mappingRegistryEntry.createdAt,
        })
        .from(schema.mappingRegistryEntry)
        .where(
          and(
            eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
            eq(schema.mappingRegistryEntry.type, start.type),
            eq(schema.mappingRegistryEntry.sourceValue, start.sourceValue),
            eq(schema.mappingRegistryEntry.scope, start.scope),
            start.sourceSystem
              ? eq(schema.mappingRegistryEntry.sourceSystem, start.sourceSystem)
              : isNull(schema.mappingRegistryEntry.sourceSystem),
          ),
        )
        .orderBy(schema.mappingRegistryEntry.version);
    }),

  // active immediately: a human typed it, so there is nothing to review
  create: workspaceProcedure
    .input(
      z
        .object({
          workspaceId: z.string(),
          type: z.enum(MAPPING_TYPES),
          sourceValue: z.string().min(1).max(500),
          targetValue: z.string().min(1).max(500),
          targetSystem: z.string().max(500).nullable().default(null),
        })
        .extend(scopeFields.shape),
    )
    .mutation(async ({ ctx, input }) => {
      requireMappingPermission(ctx.role, "create");
      const { scope, sourceSystem } = normalizeScope(input.scope, input.sourceSystem);

      const id = createId("mapping");
      try {
        await ctx.db.insert(schema.mappingRegistryEntry).values({
          id,
          workspaceId: ctx.workspaceId,
          scope,
          sourceSystem,
          type: input.type,
          sourceValue: input.sourceValue,
          targetValue: input.targetValue,
          targetSystem: input.targetSystem,
          status: "active",
          createdBy: ctx.user.id,
          approvedBy: ctx.user.id,
        });
      } catch {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A mapping for that source value already exists. Edit it instead.",
        });
      }

      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "mapping.changed",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: id,
        ip: ipFromHeaders(ctx.headers),
        metadata: { created: true },
      });
      return { id };
    }),

  update: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        mappingId: z.string(),
        targetValue: z.string().min(1).max(500),
        targetSystem: z.string().max(500).nullable().default(null),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireMappingPermission(ctx.role, "create");

      return ctx.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(schema.mappingRegistryEntry)
          .where(
            and(
              eq(schema.mappingRegistryEntry.id, input.mappingId),
              eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
              isLive,
            ),
          )
          .limit(1);
        if (!current) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Mapping not found, or it has already been replaced.",
          });
        }

        const newId = createId("mapping");
        // must supersede before inserting or the live-unique index rejects the new row
        await tx
          .update(schema.mappingRegistryEntry)
          .set({ supersededById: newId })
          .where(eq(schema.mappingRegistryEntry.id, current.id));

        await tx.insert(schema.mappingRegistryEntry).values({
          id: newId,
          workspaceId: ctx.workspaceId,
          scope: current.scope,
          sourceSystem: current.sourceSystem,
          type: current.type,
          sourceValue: current.sourceValue,
          targetValue: input.targetValue,
          targetSystem: input.targetSystem,
          status: "active",
          version: current.version + 1,
          supersedesId: current.id,
          createdBy: ctx.user.id,
          approvedBy: ctx.user.id,
        });

        await writeAudit(
          {
            workspaceId: ctx.workspaceId,
            action: "mapping.changed",
            actorType: "user",
            actorId: ctx.user.id,
            targetRef: newId,
            ip: ipFromHeaders(ctx.headers),
            metadata: { supersedes: current.id, version: current.version + 1 },
          },
          tx,
        );
        return { id: newId, version: current.version + 1 };
      });
    }),

  approve: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), mappingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireMappingPermission(ctx.role, "approve");
      const res = await ctx.db
        .update(schema.mappingRegistryEntry)
        .set({ status: "active", approvedBy: ctx.user.id })
        .where(
          and(
            eq(schema.mappingRegistryEntry.id, input.mappingId),
            eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
            eq(schema.mappingRegistryEntry.status, "suggested"),
            isLive,
          ),
        )
        .returning({ id: schema.mappingRegistryEntry.id });
      if (res.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Suggestion not found, or it is no longer pending.",
        });
      }
      logger.info("mapping.approved", `${input.mappingId} in ${ctx.workspaceId} by ${ctx.user.id}`);
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "mapping.approved",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.mappingId,
        ip: ipFromHeaders(ctx.headers),
      });
      return { approved: true };
    }),

  // kept as a tombstone, not deleted, or auto-learn re-suggests it next run
  reject: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), mappingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireMappingPermission(ctx.role, "approve");
      const res = await ctx.db
        .update(schema.mappingRegistryEntry)
        .set({ status: "rejected", approvedBy: ctx.user.id })
        .where(
          and(
            eq(schema.mappingRegistryEntry.id, input.mappingId),
            eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
            eq(schema.mappingRegistryEntry.status, "suggested"),
            isLive,
          ),
        )
        .returning({ id: schema.mappingRegistryEntry.id });
      if (res.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Suggestion not found, or it is no longer pending.",
        });
      }
      logger.info("mapping.rejected", `${input.mappingId} in ${ctx.workspaceId} by ${ctx.user.id}`);
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "mapping.changed",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.mappingId,
        ip: ipFromHeaders(ctx.headers),
        metadata: { status: "rejected" },
      });
      return { rejected: true };
    }),

  deprecate: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), mappingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireMappingPermission(ctx.role, "deprecate");
      const res = await ctx.db
        .update(schema.mappingRegistryEntry)
        .set({ status: "deprecated" })
        .where(
          and(
            eq(schema.mappingRegistryEntry.id, input.mappingId),
            eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
            eq(schema.mappingRegistryEntry.status, "active"),
            isLive,
          ),
        )
        .returning({ id: schema.mappingRegistryEntry.id });
      if (res.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mapping not found, or it is not active.",
        });
      }
      logger.info(
        "mapping.deprecated",
        `${input.mappingId} in ${ctx.workspaceId} by ${ctx.user.id}`,
      );
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "mapping.deprecated",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.mappingId,
        ip: ipFromHeaders(ctx.headers),
      });
      return { deprecated: true };
    }),

  reactivate: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), mappingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireMappingPermission(ctx.role, "approve");
      const res = await ctx.db
        .update(schema.mappingRegistryEntry)
        .set({ status: "active", approvedBy: ctx.user.id })
        .where(
          and(
            eq(schema.mappingRegistryEntry.id, input.mappingId),
            eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
            eq(schema.mappingRegistryEntry.status, "deprecated"),
            isLive,
          ),
        )
        .returning({ id: schema.mappingRegistryEntry.id });
      if (res.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Mapping not found, or it is not deprecated.",
        });
      }
      logger.info(
        "mapping.reactivated",
        `${input.mappingId} in ${ctx.workspaceId} by ${ctx.user.id}`,
      );
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "mapping.changed",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.mappingId,
        ip: ipFromHeaders(ctx.headers),
        metadata: { status: "active" },
      });
      return { reactivated: true };
    }),

  // must return the same column set importRows accepts, so an export round-trips
  exportRows: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        status: z.enum(["active", "suggested", "deprecated", "rejected"]).optional(),
        type: z.enum(MAPPING_TYPES).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId), isLive];
      // active only by default, or re-importing would promote unreviewed guesses
      conditions.push(eq(schema.mappingRegistryEntry.status, input.status ?? "active"));
      if (input.type) {
        conditions.push(eq(schema.mappingRegistryEntry.type, input.type));
      }

      const rows = await ctx.db
        .select({
          type: schema.mappingRegistryEntry.type,
          sourceValue: schema.mappingRegistryEntry.sourceValue,
          targetValue: schema.mappingRegistryEntry.targetValue,
          targetSystem: schema.mappingRegistryEntry.targetSystem,
          scope: schema.mappingRegistryEntry.scope,
          sourceSystem: schema.mappingRegistryEntry.sourceSystem,
        })
        .from(schema.mappingRegistryEntry)
        .where(and(...conditions))
        .orderBy(desc(schema.mappingRegistryEntry.createdAt))
        .limit(5000);

      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "data.exported",
        actorType: "user",
        actorId: ctx.user.id,
        ip: ipFromHeaders(ctx.headers),
        metadata: { kind: "mappings", rows: rows.length, status: input.status ?? "active" },
      });
      return rows;
    }),

  // collisions are reported back, never silently skipped or overwritten
  importRows: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        rows: z
          .array(
            z
              .object({
                type: z.enum(MAPPING_TYPES),
                sourceValue: z.string().min(1).max(500),
                targetValue: z.string().min(1).max(500),
                targetSystem: z.string().max(500).nullable().default(null),
              })
              .extend(scopeFields.shape),
          )
          .min(1)
          .max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireMappingPermission(ctx.role, "create");

      const normalized = input.rows.map((r) => ({
        ...r,
        ...normalizeScope(r.scope, r.sourceSystem),
      }));

      // must collapse in-payload duplicates first: they pass the pre-check then collide on insert
      const seen = new Set<string>();
      const deduped: typeof normalized = [];
      const duplicateInFile: string[] = [];
      for (const r of normalized) {
        const key = `${r.type}|${r.sourceValue}|${r.scope}|${r.sourceSystem ?? ""}`;
        if (seen.has(key)) {
          duplicateInFile.push(r.sourceValue);
          continue;
        }
        seen.add(key);
        deduped.push(r);
      }

      const existing = await ctx.db
        .select({
          type: schema.mappingRegistryEntry.type,
          sourceValue: schema.mappingRegistryEntry.sourceValue,
          scope: schema.mappingRegistryEntry.scope,
          sourceSystem: schema.mappingRegistryEntry.sourceSystem,
        })
        .from(schema.mappingRegistryEntry)
        .where(
          and(
            eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId),
            inArray(
              schema.mappingRegistryEntry.sourceValue,
              deduped.map((r) => r.sourceValue),
            ),
            isLive,
          ),
        );

      const taken = new Set(
        existing.map((e) => `${e.type}|${e.sourceValue}|${e.scope}|${e.sourceSystem ?? ""}`),
      );
      const fresh = deduped.filter(
        (r) => !taken.has(`${r.type}|${r.sourceValue}|${r.scope}|${r.sourceSystem ?? ""}`),
      );
      const skipped = deduped
        .filter((r) => taken.has(`${r.type}|${r.sourceValue}|${r.scope}|${r.sourceSystem ?? ""}`))
        .map((r) => r.sourceValue);

      if (fresh.length > 0) {
        await ctx.db.insert(schema.mappingRegistryEntry).values(
          fresh.map((r) => ({
            id: createId("mapping"),
            workspaceId: ctx.workspaceId,
            scope: r.scope,
            sourceSystem: r.sourceSystem,
            type: r.type,
            sourceValue: r.sourceValue,
            targetValue: r.targetValue,
            targetSystem: r.targetSystem,
            status: "active" as const,
            createdBy: ctx.user.id,
            approvedBy: ctx.user.id,
          })),
        );
      }

      logger.info(
        "mapping.imported",
        `${fresh.length} added, ${skipped.length} skipped in ${ctx.workspaceId} by ${ctx.user.id}`,
      );
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "mapping.imported",
        actorType: "user",
        actorId: ctx.user.id,
        ip: ipFromHeaders(ctx.headers),
        metadata: { imported: fresh.length, skipped: skipped.length + duplicateInFile.length },
      });
      return {
        imported: fresh.length,
        skipped: [...skipped, ...duplicateInFile],
      };
    }),
});
