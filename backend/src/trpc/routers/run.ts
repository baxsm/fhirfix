import { redactionPolicyFor, storeRunInput } from "@shared/db/ingest";
import { detectInput, ENGINE_VERSION } from "@shared/engine";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { blobKey, blobStore } from "@/lib/blob";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { applyQueue, remediationQueue } from "@/queues/index";
import { creditGatedProcedure, router, workspaceProcedure } from "../trpc";

const submitSchema = z.object({
  workspaceId: z.string(),
  content: z.string().min(1).max(5_000_000), // raw resource/bundle/hl7v2
  profiles: z.array(z.string()).optional(),
  autoFix: z.boolean().default(true),
});


export const runRouter = router({
  submit: creditGatedProcedure.input(submitSchema).mutation(async ({ ctx, input }) => {
    const runId = createId("run");
    const inputType = detectInput(input.content).inputType;
    const key = blobKey(ctx.workspaceId, runId, "input");

    // one ingest path for every entry point: applies the workspace redaction
    // policy and records whether what landed on disk actually carries PHI.
    const policy = await redactionPolicyFor(ctx.db, ctx.workspaceId);
    const stored = await storeRunInput(ctx.db, blobStore, {
      workspaceId: ctx.workspaceId,
      key,
      content: input.content,
      policy,
    });
    if (stored.rejected) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "This workspace requires PHI redaction, and this input could not be parsed to redact it. Send FHIR JSON, or change the redaction policy in settings.",
      });
    }

    await ctx.db.insert(schema.run).values({
      id: runId,
      workspaceId: ctx.workspaceId,
      actorType: "user",
      actorId: ctx.user.id,
      source: "ui",
      inputType,
      engineVersion: ENGINE_VERSION,
      status: "queued",
      profilesRequested: input.profiles ?? [],
      // null under the "required" policy: the raw artifact is never persisted.
      inputRef: stored.key,
    });

    await remediationQueue.add(
      "remediate",
      {
        runId,
        workspaceId: ctx.workspaceId,
        profiles: input.profiles ?? [],
        autoFix: input.autoFix,
      },
      { removeOnComplete: 1000, removeOnFail: 1000 },
    );

    logger.info("run.submit", `queued ${runId} (${inputType})`);
    await writeAudit({
      workspaceId: ctx.workspaceId,
      action: "run.created",
      actorType: "user",
      actorId: ctx.user.id,
      targetRef: runId,
      ip: ipFromHeaders(ctx.headers),
      metadata: { inputType, source: "ui" },
    });
    return { runId, status: "queued" as const };
  }),

  get: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), runId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [runRow] = await ctx.db
        .select()
        .from(schema.run)
        .where(and(eq(schema.run.id, input.runId), eq(schema.run.workspaceId, ctx.workspaceId)))
        .limit(1);

      if (!runRow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
      }

      const findings = await ctx.db
        .select()
        .from(schema.finding)
        .where(eq(schema.finding.runId, input.runId))
        .orderBy(desc(schema.finding.rank));

      let corrected: string | null = null;
      if (runRow.correctedRef) {
        try {
          corrected = await blobStore.get(runRow.correctedRef);
        } catch {
          corrected = null;
        }
      }

      // the original input is the "before" side of the report diff.
      let inputRaw: string | null = null;
      if (runRow.inputRef) {
        try {
          inputRaw = await blobStore.get(runRow.inputRef);
        } catch {
          inputRaw = null;
        }
      }

      return { run: runRow, findings, corrected, input: inputRaw };
    }),

  // recent runs for the workspace. drives the run history table.
  list: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.run)
      .where(eq(schema.run.workspaceId, ctx.workspaceId))
      .orderBy(desc(schema.run.createdAt))
      .limit(50);
  }),

  // conformance score over time (completed runs). drives the trend line.
  trend: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: schema.run.id,
        createdAt: schema.run.createdAt,
        before: schema.run.conformanceScoreBefore,
        after: schema.run.conformanceScoreAfter,
        findingsTotal: schema.run.findingsTotal,
      })
      .from(schema.run)
      .where(and(eq(schema.run.workspaceId, ctx.workspaceId), eq(schema.run.status, "completed")))
      .orderBy(asc(schema.run.createdAt))
      .limit(60);
  }),

  applyFix: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        runId: z.string(),
        fingerprints: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.role, "run", "create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot apply fixes." });
      }
      const [runRow] = await ctx.db
        .select({ status: schema.run.status, profiles: schema.run.profilesRequested })
        .from(schema.run)
        .where(and(eq(schema.run.id, input.runId), eq(schema.run.workspaceId, ctx.workspaceId)))
        .limit(1);
      if (!runRow) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
      if (runRow.status === "running" || runRow.status === "queued") {
        throw new TRPCError({ code: "CONFLICT", message: "The run is still processing." });
      }

      await ctx.db
        .update(schema.run)
        .set({ status: "running" })
        .where(eq(schema.run.id, input.runId));
      await applyQueue.add(
        "apply",
        {
          runId: input.runId,
          workspaceId: ctx.workspaceId,
          kind: "deterministic" as const,
          fingerprints: input.fingerprints,
          profiles: runRow.profiles ?? [],
        },
        { removeOnComplete: 1000, removeOnFail: 1000 },
      );
      return { status: "running" as const };
    }),

  fixWithAi: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), runId: z.string(), fingerprint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.role, "run", "create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot apply fixes." });
      }
      const [runRow] = await ctx.db
        .select({ status: schema.run.status, profiles: schema.run.profilesRequested })
        .from(schema.run)
        .where(and(eq(schema.run.id, input.runId), eq(schema.run.workspaceId, ctx.workspaceId)))
        .limit(1);
      if (!runRow) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
      if (runRow.status === "running" || runRow.status === "queued") {
        throw new TRPCError({ code: "CONFLICT", message: "The run is still processing." });
      }

      await ctx.db
        .update(schema.run)
        .set({ status: "running" })
        .where(eq(schema.run.id, input.runId));
      await applyQueue.add(
        "apply-ai",
        {
          runId: input.runId,
          workspaceId: ctx.workspaceId,
          kind: "ai" as const,
          fingerprints: [input.fingerprint],
          profiles: runRow.profiles ?? [],
        },
        { removeOnComplete: 1000, removeOnFail: 1000 },
      );
      return { status: "running" as const };
    }),

  dismissFinding: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), runId: z.string(), findingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.role, "run", "create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot dismiss findings." });
      }
      const res = await ctx.db
        .update(schema.finding)
        .set({ fixStatus: "dismissed", dismissedBy: ctx.user.id })
        .where(
          and(
            eq(schema.finding.id, input.findingId),
            eq(schema.finding.runId, input.runId),
            eq(schema.finding.workspaceId, ctx.workspaceId),
          ),
        )
        .returning({ id: schema.finding.id });
      if (res.length === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "Finding not found." });
      return { dismissed: true };
    }),

  cancel: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), runId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [runRow] = await ctx.db
        .select({ status: schema.run.status })
        .from(schema.run)
        .where(and(eq(schema.run.id, input.runId), eq(schema.run.workspaceId, ctx.workspaceId)))
        .limit(1);
      if (!runRow) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
      if (runRow.status === "completed" || runRow.status === "failed") {
        return { cancelled: false as const, status: runRow.status };
      }
      const job = await remediationQueue.getJob(input.runId);
      await job?.remove().catch(() => {});
      await ctx.db
        .update(schema.run)
        .set({ status: "failed", errorMessage: "Cancelled by user.", completedAt: new Date() })
        .where(eq(schema.run.id, input.runId));
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "run.cancelled",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.runId,
        ip: ipFromHeaders(ctx.headers),
      });
      return { cancelled: true as const, status: "failed" as const };
    }),

});
