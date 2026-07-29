import { deleteWorkspaceData, exportWorkspaceData } from "@shared/db/gdpr";
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

  // portability archive. an export IS a read of everything, so it audits itself.
  exportData: enforceRole("workspaceSettings", "update")
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const archive = await exportWorkspaceData(ctx.db, input.workspaceId);
      await writeAudit({
        workspaceId: input.workspaceId,
        action: "data.exported",
        actorType: "user",
        actorId: ctx.user.id,
        ip: ipFromHeaders(ctx.headers),
        metadata: { kind: "workspace_archive", runs: archive.runs.length },
      });
      return archive;
    }),

  // irreversible. owner only, and the caller must type the slug back to us so a
  // misdirected click cannot destroy a workspace.
  delete: workspaceProcedure
    .input(z.object({ workspaceId: z.string(), confirmSlug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only an owner can delete a workspace.",
        });
      }

      const [org] = await ctx.db
        .select({ slug: schema.organization.slug, name: schema.organization.name })
        .from(schema.organization)
        .where(eq(schema.organization.id, input.workspaceId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found." });
      if (input.confirmSlug !== org.slug) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The typed name does not match this workspace.",
        });
      }

      // written BEFORE the delete: afterwards this workspace's rows are detached,
      // so an entry written after would land on the tombstone and lose the name.
      await writeAudit({
        workspaceId: input.workspaceId,
        action: "workspace.deleted",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.workspaceId,
        ip: ipFromHeaders(ctx.headers),
        metadata: { slug: org.slug, name: org.name },
      });

      const summary = await deleteWorkspaceData(ctx.db, input.workspaceId);

      // removing the organization revokes every member's access immediately.
      await auth.api.deleteOrganization({
        headers: ctx.headers,
        body: { organizationId: input.workspaceId },
      });

      logger.info("workspace.delete", `${org.slug} removed by ${ctx.user.id}`);
      return summary;
    }),

  // SSO config is stubbed in phase 1 and built in phase 8. do not wire the plugin yet.
  ssoGet: enforceRole("workspaceSettings", "view").query(() => {
    return { configured: false as const };
  }),
});
