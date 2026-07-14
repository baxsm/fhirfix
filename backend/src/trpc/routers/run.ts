import { detectInput, ENGINE_VERSION } from "@fhirfix/engine";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { blobKey, blobStore } from "@/lib/blob";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { remediationQueue } from "@/queues/index";
import { router, workspaceProcedure } from "../trpc";

const submitSchema = z.object({
  workspaceId: z.string(),
  content: z.string().min(1).max(5_000_000), // raw resource/bundle/hl7v2
  profiles: z.array(z.string()).optional(),
  autoFix: z.boolean().default(true),
});

export const runRouter = router({
  // enqueue a validate/convert/fix job. writes the durable run row + input blob,
  // then hands off to the worker via the remediation queue. returns the run id.
  submit: workspaceProcedure.input(submitSchema).mutation(async ({ ctx, input }) => {
    const runId = createId("run");
    const inputType = detectInput(input.content).inputType;
    const key = blobKey(ctx.workspaceId, runId, "input");

    const { sha256, sizeBytes } = await blobStore.put(key, input.content, "application/json");

    // track the input blob. marked stored immediately (local fs is synchronous);
    // the run is only completed once its artifacts are stored.
    await ctx.db.insert(schema.storedObject).values({
      key,
      workspaceId: ctx.workspaceId,
      bucket: "local",
      kind: "input",
      sizeBytes,
      contentType: "application/json",
      sha256,
      containsPhi: false,
      uploadState: "stored",
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
      profilesApplied: input.profiles ?? [],
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

  // poll a run: its status + ranked findings. used by the harness page.
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

      return { run: runRow, findings, corrected };
    }),

  // recent runs for the workspace.
  list: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.run)
      .where(eq(schema.run.workspaceId, ctx.workspaceId))
      .orderBy(desc(schema.run.createdAt))
      .limit(25);
  }),
});
