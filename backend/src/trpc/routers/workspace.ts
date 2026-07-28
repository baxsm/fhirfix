import { grantTrialCredits } from "@shared/db/ledger";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { enforceRole, protectedProcedure, router, workspaceProcedure } from "../trpc";

const settingsUpdateSchema = z.object({
  workspaceId: z.string(),
  defaultProfiles: z.array(z.string()).optional(),
  defaultTerminologyServer: z.string().nullable().optional(),
  redactionPolicy: z.enum(["off", "on_ingest", "required"]).optional(),
  dataRetentionDays: z.number().int().min(1).max(3650).optional(),
});

export const workspaceRouter = router({
  // every workspace the signed-in user belongs to.
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgs = await auth.api.listOrganizations({ headers: ctx.headers });
    return orgs;
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(80), slug: z.string().min(1).max(60) }))
    .mutation(async ({ ctx, input }) => {
      const org = await auth.api.createOrganization({
        headers: ctx.headers,
        body: { name: input.name, slug: input.slug },
      });

      if (!org) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Could not create workspace." });
      }

      // seed the 1:1 settings row with defaults.
      await ctx.db.insert(schema.workspaceSettings).values({
        id: createId("workspaceSettings"),
        workspaceId: org.id,
      });

      await grantTrialCredits(ctx.db, org.id, ctx.user.id);

      logger.info("workspace.create", `created ${org.id}`);
      return org;
    }),

  get: workspaceProcedure.query(async ({ ctx, input }) => {
    const org = await auth.api.getFullOrganization({
      headers: ctx.headers,
      query: { organizationId: input.workspaceId },
    });

    const [settings] = await ctx.db
      .select()
      .from(schema.workspaceSettings)
      .where(eq(schema.workspaceSettings.workspaceId, input.workspaceId))
      .limit(1);

    return { organization: org, settings: settings ?? null, role: ctx.role };
  }),

  updateSettings: enforceRole("workspaceSettings", "update")
    .input(settingsUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const { workspaceId, ...changes } = input;
      const [updated] = await ctx.db
        .update(schema.workspaceSettings)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace settings not found." });
      }
      await writeAudit({
        workspaceId,
        action: "settings.changed",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: workspaceId,
        ip: ipFromHeaders(ctx.headers),
        metadata: { changed: Object.keys(changes) },
      });
      return updated;
    }),

  // SSO config is stubbed in phase 1 and built in phase 8. do not wire the plugin yet.
  ssoGet: enforceRole("workspaceSettings", "view").query(() => {
    return { configured: false as const };
  }),
});
