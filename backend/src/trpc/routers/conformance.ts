import type { Db } from "@shared/db/client";
import { automatableKits, diffMatrices, summarizeMatrix, TEST_KITS } from "@shared/engine";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { blobStore } from "@/lib/blob";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { requirePremiumPlan } from "@/lib/require-premium";
import { encryptSecret } from "@/lib/secret-crypto";
import { conformanceQueue } from "@/queues/index";
import { router, workspaceProcedure } from "../trpc";

const KIT_IDS = TEST_KITS.map((kit) => kit.id) as [string, ...string[]];

// inferno rejects any auth_type outside this set, so it is validated at the edge
const authConfig = z
  .object({
    auth_type: z.enum(["public", "symmetric", "asymmetric", "backend_services"]),
    token_url: z.string().max(500).optional(),
    requested_scopes: z.string().max(1000).optional(),
    client_id: z.string().max(500).optional(),
    client_secret: z.string().max(500).optional(),
    access_token: z.string().max(4000).optional(),
  })
  .refine(
    (auth) =>
      auth.access_token !== undefined ||
      (auth.auth_type === "backend_services" && !!auth.token_url && !!auth.client_id),
    {
      message:
        "Provide an access token, or pick backend services and give a token URL and client ID.",
    },
  );

// endpoints are stored redacted, so the comparison must use the redacted form
async function lastPacketFor(
  db: Db,
  workspaceId: string,
  targetEndpoint: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: schema.conformancePacketRun.id })
    .from(schema.conformancePacketRun)
    .where(
      and(
        eq(schema.conformancePacketRun.workspaceId, workspaceId),
        eq(schema.conformancePacketRun.targetEndpoint, redactEndpoint(targetEndpoint)),
        eq(schema.conformancePacketRun.status, "completed"),
      ),
    )
    .orderBy(desc(schema.conformancePacketRun.createdAt))
    .limit(1);
  return row?.id ?? null;
}

async function requirePremium(db: Db, workspaceId: string): Promise<void> {
  await requirePremiumPlan(db, workspaceId, "Conformance packets");
}

function assertHttpUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Endpoint must be a valid URL." });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Endpoint must be an http or https URL." });
  }
}

// the stored endpoint is shown back to auditors, so it must carry no credentials
function redactEndpoint(value: string): string {
  const parsed = new URL(value);
  parsed.username = "";
  parsed.password = "";
  parsed.search = "";
  return parsed.toString();
}

export const conformanceRouter = router({
  kits: workspaceProcedure.query(() => {
    return TEST_KITS.map((kit) => ({
      id: kit.id,
      label: kit.label,
      igIdentifier: kit.igIdentifier,
      igVersion: kit.igVersion,
      kitVersion: kit.kitVersion,
      attended: kit.attended,
      attendedReason: kit.attendedReason ?? null,
    }));
  }),

  list: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: schema.conformancePacketRun.id,
        status: schema.conformancePacketRun.status,
        testKits: schema.conformancePacketRun.testKits,
        targetEndpoint: schema.conformancePacketRun.targetEndpoint,
        overallResult: schema.conformancePacketRun.overallResult,
        passCount: schema.conformancePacketRun.passCount,
        failCount: schema.conformancePacketRun.failCount,
        igVersions: schema.conformancePacketRun.igVersions,
        infernoVersion: schema.conformancePacketRun.infernoVersion,
        errorMessage: schema.conformancePacketRun.errorMessage,
        startedAt: schema.conformancePacketRun.startedAt,
        completedAt: schema.conformancePacketRun.completedAt,
        createdAt: schema.conformancePacketRun.createdAt,
      })
      .from(schema.conformancePacketRun)
      .where(eq(schema.conformancePacketRun.workspaceId, ctx.workspaceId))
      .orderBy(desc(schema.conformancePacketRun.createdAt))
      .limit(50);
  }),

  get: workspaceProcedure
    .input(z.object({ packetRunId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [packet] = await ctx.db
        .select()
        .from(schema.conformancePacketRun)
        .where(eq(schema.conformancePacketRun.id, input.packetRunId))
        .limit(1);

      if (!packet || packet.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conformance packet not found." });
      }

      const [evidence] = await ctx.db
        .select({
          id: schema.evidenceBundle.id,
          sha256: schema.evidenceBundle.sha256,
          sizeBytes: schema.evidenceBundle.sizeBytes,
          createdAt: schema.evidenceBundle.createdAt,
        })
        .from(schema.evidenceBundle)
        .where(eq(schema.evidenceBundle.packetRunId, packet.id))
        .limit(1);

      let regressions: ReturnType<typeof diffMatrices> = [];
      if (packet.previousRunId && packet.resultsMatrix) {
        const [prior] = await ctx.db
          .select({ resultsMatrix: schema.conformancePacketRun.resultsMatrix })
          .from(schema.conformancePacketRun)
          .where(eq(schema.conformancePacketRun.id, packet.previousRunId))
          .limit(1);
        regressions = diffMatrices(prior?.resultsMatrix ?? [], packet.resultsMatrix);
      }

      // authConfigRef points at the encrypted oauth secret, never send it out
      const { authConfigRef: _authConfigRef, ...safe } = packet;

      return {
        ...safe,
        summary: packet.resultsMatrix ? summarizeMatrix(packet.resultsMatrix) : null,
        evidence: evidence ?? null,
        regressions,
      };
    }),

  launch: workspaceProcedure
    .input(
      z.object({
        testKits: z.array(z.enum(KIT_IDS)).min(1),
        targetEndpoint: z.string().min(1).max(500),
        auth: authConfig.optional(),
        previousRunId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requirePremium(ctx.db, ctx.workspaceId);
      assertHttpUrl(input.targetEndpoint);

      const selectable = new Set(automatableKits().map((kit) => kit.id));
      const runnable = input.testKits.filter((kit) => selectable.has(kit as never));
      if (runnable.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pick at least one kit that can run unattended.",
        });
      }

      let authConfigRef: string | null = null;
      if (input.auth && Object.keys(input.auth).length > 0) {
        const secretId = createId("secret");
        await ctx.db.insert(schema.encryptedSecret).values({
          id: secretId,
          workspaceId: ctx.workspaceId,
          ciphertext: encryptSecret(JSON.stringify(input.auth)),
        });
        authConfigRef = secretId;
      }

      // linked server-side: the ui never sends previousRunId, which leaves the diff empty
      const previousRunId =
        input.previousRunId ?? (await lastPacketFor(ctx.db, ctx.workspaceId, input.targetEndpoint));

      const packetRunId = createId("packet");
      await ctx.db.insert(schema.conformancePacketRun).values({
        id: packetRunId,
        workspaceId: ctx.workspaceId,
        actorId: ctx.user.id,
        testKits: runnable,
        igVersions: {},
        infernoVersion: "pending",
        targetEndpoint: redactEndpoint(input.targetEndpoint),
        authConfigRef,
        previousRunId,
        status: "queued",
      });

      await conformanceQueue.add(
        "packet",
        { packetRunId },
        { removeOnComplete: 100, removeOnFail: 500 },
      );

      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "packet.launched",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: packetRunId,
        ip: ipFromHeaders(ctx.headers),
      });
      return { packetRunId };
    }),

  exportEvidence: workspaceProcedure
    .input(z.object({ packetRunId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [evidence] = await ctx.db
        .select({
          bundleRef: schema.evidenceBundle.bundleRef,
          sha256: schema.evidenceBundle.sha256,
          workspaceId: schema.evidenceBundle.workspaceId,
        })
        .from(schema.evidenceBundle)
        .where(eq(schema.evidenceBundle.packetRunId, input.packetRunId))
        .limit(1);

      if (!evidence || evidence.workspaceId !== ctx.workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Evidence bundle not found." });
      }

      const content = await blobStore.get(evidence.bundleRef);

      // a payer hands this to a regulator, so who took a copy is part of the record
      await writeAudit({
        workspaceId: ctx.workspaceId,
        action: "packet.exported",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.packetRunId,
        ip: ipFromHeaders(ctx.headers),
        metadata: { sha256: evidence.sha256 },
      });

      return { content, sha256: evidence.sha256 };
    }),
});
