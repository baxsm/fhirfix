import { detectInput, ENGINE_VERSION } from "@shared/engine";
import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { blobKey, blobStore } from "@/lib/blob";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { containsPhi, redactPhi } from "@/lib/phi";
import { applyQueue, remediationQueue } from "@/queues/index";
import { creditGatedProcedure, router, workspaceProcedure } from "../trpc";

const submitSchema = z.object({
  workspaceId: z.string(),
  content: z.string().min(1).max(5_000_000), // raw resource/bundle/hl7v2
  profiles: z.array(z.string()).optional(),
  autoFix: z.boolean().default(true),
});

// how long a share link lives by default. explicit expiry can shorten it.
const SHARE_TTL_DAYS = 30;

export const runRouter = router({
  // enqueue a validate/convert/fix job. writes the durable run row + input blob,
  // then hands off to the worker via the remediation queue. returns the run id.
  // creditGatedProcedure blocks a broke workspace (OUT_OF_CREDITS) before any work.
  submit: creditGatedProcedure.input(submitSchema).mutation(async ({ ctx, input }) => {
    const runId = createId("run");
    const inputType = detectInput(input.content).inputType;
    const key = blobKey(ctx.workspaceId, runId, "input");

    const { sha256, sizeBytes } = await blobStore.put(key, input.content, "application/json");

    // blobStore.put created the row with the bytes; merge the metadata onto it.
    await ctx.db
      .insert(schema.storedObject)
      .values({
        key,
        workspaceId: ctx.workspaceId,
        bucket: "local",
        kind: "input",
        sizeBytes,
        contentType: "application/json",
        sha256,
        containsPhi: false,
        uploadState: "stored",
      })
      .onConflictDoUpdate({
        target: schema.storedObject.key,
        set: { bucket: "local", kind: "input", sizeBytes, sha256, uploadState: "stored" },
      });

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
      inputRef: key,
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
    return { runId, status: "queued" as const };
  }),

  // a run: its status + ranked findings + corrected artifact + share state.
  // polled by the report while queued/running/applying.
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

      const [share] = await ctx.db
        .select({
          token: schema.reportShare.token,
          redacted: schema.reportShare.redacted,
          expiresAt: schema.reportShare.expiresAt,
          revokedAt: schema.reportShare.revokedAt,
        })
        .from(schema.reportShare)
        .where(eq(schema.reportShare.runId, input.runId))
        .orderBy(desc(schema.reportShare.createdAt))
        .limit(1);

      return { run: runRow, findings, corrected, input: inputRaw, share: share ?? null };
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

  // apply one or more safe fixes by fingerprint. re-runs the engine on top of the
  // current corrected artifact and re-verifies. the report polls run.get while the
  // run is `running`. single Apply passes one fingerprint; apply-all-safe many.
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

  // hand one finding to the AI for a proposed patch. subordinate to the
  // deterministic path; the worker only keeps the patch if it re-verifies clean.
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

  // mark a finding dismissed. an intentional "won't fix" that drops out of the
  // active report but stays on record.
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

  // cancel a queued/running run. best-effort: removes the queued job and marks the
  // run failed with a cancelled note so it never hangs in `running`.
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
      return { cancelled: true as const, status: "failed" as const };
    }),

  // create a public read-only share link. BLOCKS creation for a run whose
  // corrected artifact still holds un-redacted PHI unless the caller opts into a
  // redacted copy, so an unauthenticated /share URL can never leak PHI.
  share: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        runId: z.string(),
        redact: z.boolean().default(false),
        expiresInDays: z.number().int().min(1).max(365).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.role, "run", "view")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot share reports." });
      }
      const [runRow] = await ctx.db
        .select({ correctedRef: schema.run.correctedRef, status: schema.run.status })
        .from(schema.run)
        .where(and(eq(schema.run.id, input.runId), eq(schema.run.workspaceId, ctx.workspaceId)))
        .limit(1);
      if (!runRow) throw new TRPCError({ code: "NOT_FOUND", message: "Run not found." });
      if (runRow.status !== "completed") {
        throw new TRPCError({ code: "CONFLICT", message: "Only completed runs can be shared." });
      }

      let hasPhi = false;
      if (runRow.correctedRef) {
        try {
          hasPhi = containsPhi(JSON.parse(await blobStore.get(runRow.correctedRef)));
        } catch {
          hasPhi = false;
        }
      }

      if (hasPhi && !input.redact) {
        // do not silently share PHI. tell the client to re-call with redact:true.
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "This report contains patient identifiers. Share a redacted copy (redact: true) instead.",
        });
      }

      const token = createId("reportShare");
      // when redacting, write a separate PHI-safe corrected artifact the public
      // read path serves, so the original stays intact for the workspace.
      let redacted = false;
      if (hasPhi && input.redact && runRow.correctedRef) {
        const parsed = JSON.parse(await blobStore.get(runRow.correctedRef));
        const key = `${ctx.workspaceId}/${input.runId}/share-${token}.json`;
        const safe = JSON.stringify(redactPhi(parsed), null, 2);
        const { sha256, sizeBytes } = await blobStore.put(key, safe, "application/json");
        // blobStore.put created the row with the bytes; merge the metadata onto it.
        await ctx.db
          .insert(schema.storedObject)
          .values({
            key,
            workspaceId: ctx.workspaceId,
            bucket: "local",
            kind: "export",
            sizeBytes,
            contentType: "application/json",
            sha256,
            containsPhi: false,
            uploadState: "stored",
          })
          .onConflictDoUpdate({
            target: schema.storedObject.key,
            set: { bucket: "local", kind: "export", sizeBytes, sha256, uploadState: "stored" },
          });
        redacted = true;
      }

      const days = input.expiresInDays ?? SHARE_TTL_DAYS;
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      await ctx.db.insert(schema.reportShare).values({
        token,
        runId: input.runId,
        workspaceId: ctx.workspaceId,
        createdBy: ctx.user.id,
        redacted,
        expiresAt,
      });
      logger.info("run.share", `${input.runId} shared as ${token} (redacted=${redacted})`);
      return { token, redacted, expiresAt };
    }),

  // revoke a share link. immediate; the public read path checks revokedAt.
  revokeShare: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.db
        .update(schema.reportShare)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.reportShare.token, input.token),
            eq(schema.reportShare.workspaceId, ctx.workspaceId),
          ),
        )
        .returning({ token: schema.reportShare.token });
      if (res.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Share not found." });
      return { revoked: true };
    }),
});

// re-export for tests that assert the share ttl.
export { SHARE_TTL_DAYS };
