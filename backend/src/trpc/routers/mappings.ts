import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { router, workspaceProcedure } from "../trpc";

// the mapping registry. every write is versioned: an edit supersedes the old row
// rather than mutating it, because one mapping change silently rewrites every
// downstream record the next run touches, and "what did this look like in March"
// has to stay answerable.

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

const scopeFields = z.object({
  scope: z.enum(MAPPING_SCOPES).default("workspace"),
  sourceSystem: z.string().min(1).max(200).nullable().default(null),
});

// a source_system-scoped mapping without a source system would apply to nothing,
// and a workspace-scoped one carrying a source system is a contradiction. reject
// both rather than silently normalizing, so the caller learns which they meant.
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
  // the registry as it stands now. superseded rows are excluded; history is its
  // own endpoint. ordered newest first within a status so a fresh suggestion is
  // the first thing a reviewer sees.
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
      if (input.search) {
        const needle = `%${input.search.toLowerCase()}%`;
        const bySource = sql`lower(${schema.mappingRegistryEntry.sourceValue}) like ${needle}`;
        const byTarget = sql`lower(${schema.mappingRegistryEntry.targetValue}) like ${needle}`;
        const match = or(bySource, byTarget);
        if (match) conditions.push(match);
      }

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

  // counts per status, so the ui can label its filters without pulling every row.
  counts: workspaceProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        status: schema.mappingRegistryEntry.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.mappingRegistryEntry)
      .where(and(eq(schema.mappingRegistryEntry.workspaceId, ctx.workspaceId), isLive))
      .groupBy(schema.mappingRegistryEntry.status);

    const counts = { active: 0, suggested: 0, deprecated: 0, rejected: 0 };
    for (const r of rows) {
      counts[r.status] = r.count;
    }
    return counts;
  }),

  // the supersede chain for one mapping, oldest first. walks backwards through
  // supersedesId from whichever version the caller happens to hold.
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

      // every version shares the identity tuple, so selecting on it returns the
      // whole chain without recursing row by row.
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

  // add a mapping by hand. active immediately: a human typed it, so there is
  // nothing to review.
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
        // the live-unique index rejected it: something already maps this source
        // value at this scope. editing that row is the supported path.
        throw new TRPCError({
          code: "CONFLICT",
          message: "A mapping for that source value already exists. Edit it instead.",
        });
      }

      logger.info("mapping.created", `${id} in ${ctx.workspaceId} by ${ctx.user.id}`);
      return { id };
    }),

  // edit a mapping by superseding it. the old row keeps its values and gains a
  // pointer to the new one, so a report from before the change still explains
  // itself. never an in-place update.
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
        // point the old row at the new one first: the live-unique index only
        // permits one unsuperseded row per identity tuple, so the insert would
        // collide with the row it is replacing.
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

        logger.info(
          "mapping.updated",
          `${current.id} -> ${newId} (v${current.version + 1}) in ${ctx.workspaceId} by ${ctx.user.id}`,
        );
        return { id: newId, version: current.version + 1 };
      });
    }),

  // approve an auto-learned suggestion. this is the compounding step: from here
  // every run auto-fixes the thing that previously needed review.
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
      return { approved: true };
    }),

  // turn a suggestion down. kept as a tombstone rather than deleted so the
  // auto-learn loop does not re-suggest it on the next run.
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
      return { rejected: true };
    }),

  // retire an active mapping. future runs stop using it; the row and its history
  // stay, and past reports still explain what they did.
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
      return { deprecated: true };
    }),

  // bring a deprecated mapping back. the inverse of deprecate, so a mistake is
  // one click to undo rather than a re-typed row with a new id.
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
      return { reactivated: true };
    }),

  // bulk import. rows that collide with an existing live mapping are reported
  // back rather than silently skipped or silently overwritten, because either
  // one hides a mapping the caller believes they just imported.
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

      // a duplicate inside the payload itself would pass the pre-check and then
      // collide on insert, so collapse them first and report the loser.
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
      return {
        imported: fresh.length,
        skipped: [...skipped, ...duplicateInFile],
      };
    }),
});
