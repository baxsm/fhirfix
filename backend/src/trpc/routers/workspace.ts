import { deleteWorkspaceData, exportWorkspaceData } from "@shared/db/gdpr";
import { grantTrialCredits } from "@shared/db/ledger";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { sendBaaRequestEmail } from "@/lib/baa-email";
import { schema } from "@/lib/db";
import { env } from "@/lib/env";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { requirePremiumPlan } from "@/lib/require-premium";
import { certFingerprint, parseIdpMetadata } from "@/lib/saml-metadata";
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

  // the terms page tells a customer to request a BAA here, so this has to reach
  // a real person. status only moves to "requested" once the email is away.
  requestBaa: enforceRole("workspaceSettings", "update")
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [settings] = await ctx.db
        .select({ baaStatus: schema.workspaceSettings.baaStatus })
        .from(schema.workspaceSettings)
        .where(eq(schema.workspaceSettings.workspaceId, input.workspaceId))
        .limit(1);

      if (!settings) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace settings not found." });
      }
      // already handled. re-requesting would mail the compliance inbox again for
      // an agreement that is already in flight or signed.
      if (settings.baaStatus !== "none") {
        return { baaStatus: settings.baaStatus };
      }

      const [org] = await ctx.db
        .select({ slug: schema.organization.slug, name: schema.organization.name })
        .from(schema.organization)
        .where(eq(schema.organization.id, input.workspaceId))
        .limit(1);
      if (!org) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found." });

      try {
        await sendBaaRequestEmail({
          workspaceName: org.name,
          workspaceSlug: org.slug,
          requestedByName: ctx.user.name || ctx.user.email,
          requestedByEmail: ctx.user.email,
        });
      } catch (error) {
        logger.error("workspace.requestBaa", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not send the request. Try again, or email legal@fhirfix.dev.",
        });
      }

      const [updated] = await ctx.db
        .update(schema.workspaceSettings)
        .set({ baaStatus: "requested", updatedAt: new Date() })
        .where(eq(schema.workspaceSettings.workspaceId, input.workspaceId))
        .returning({ baaStatus: schema.workspaceSettings.baaStatus });

      await writeAudit({
        workspaceId: input.workspaceId,
        action: "baa.requested",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.workspaceId,
        ip: ipFromHeaders(ctx.headers),
      });

      return { baaStatus: updated?.baaStatus ?? "requested" };
    }),

  // what the settings page shows. never returns the raw certificate: an admin
  // compares the fingerprint against their IdP, they do not need the bytes back.
  ssoGet: enforceRole("workspaceSettings", "view").query(async ({ ctx, input }) => {
    if (!env.SSO_ENABLED) return { enabled: false as const, provider: null };

    const [row] = await ctx.db
      .select({
        providerId: schema.ssoProvider.providerId,
        issuer: schema.ssoProvider.issuer,
        domain: schema.ssoProvider.domain,
        samlConfig: schema.ssoProvider.samlConfig,
      })
      .from(schema.ssoProvider)
      .where(eq(schema.ssoProvider.organizationId, input.workspaceId))
      .limit(1);

    if (!row) return { enabled: true as const, provider: null };

    const cert = parseSamlCert(row.samlConfig);
    return {
      enabled: true as const,
      provider: {
        providerId: row.providerId,
        issuer: row.issuer,
        domain: row.domain,
        entryPoint: parseSamlEntryPoint(row.samlConfig),
        certFingerprint: cert ? await certFingerprint(cert) : null,
      },
    };
  }),

  // owner only, and premium. registering an IdP means handing it the power to
  // assert who a member is, which is a strictly stronger claim than any other
  // workspace setting.
  ssoUpsert: workspaceProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        domain: z.string().min(1).max(253),
        // either a metadata url we fetch, or the three fields typed by hand
        metadataUrl: z.url().optional(),
        issuer: z.string().optional(),
        entryPoint: z.url().optional(),
        cert: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.SSO_ENABLED) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SSO is not enabled." });
      }
      if (ctx.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only an owner can configure SSO." });
      }
      await requirePremiumPlan(ctx.db, input.workspaceId, "Single sign-on");

      let idp: { entityId: string; entryPoint: string; cert: string } | null = null;

      if (input.metadataUrl) {
        const xml = await fetch(input.metadataUrl, { signal: AbortSignal.timeout(10_000) })
          .then((r) => (r.ok ? r.text() : null))
          .catch(() => null);
        if (!xml) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Could not reach that metadata URL. Check it, or enter the details manually.",
          });
        }
        idp = parseIdpMetadata(xml);
        if (!idp) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "That URL did not return SAML metadata we could read.",
          });
        }
      } else if (input.issuer && input.entryPoint && input.cert) {
        idp = {
          entityId: input.issuer,
          entryPoint: input.entryPoint,
          cert: input.cert.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, ""),
        };
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Provide a metadata URL, or the issuer, sign-on URL and certificate.",
        });
      }

      // one provider per workspace. re-configuring replaces rather than stacks,
      // otherwise a stale IdP would keep working after being "replaced".
      const providerId = `ws-${input.workspaceId}`;
      await ctx.db
        .delete(schema.ssoProvider)
        .where(eq(schema.ssoProvider.organizationId, input.workspaceId));

      const sp = `${env.BETTER_AUTH_URL}/api/auth/sso/saml2/sp/metadata`;
      const mapping = {
        id: "nameID",
        email: "email",
        emailVerified: "emailVerified",
        name: "displayName",
        firstName: "givenName",
        lastName: "surname",
      };

      await ctx.db.insert(schema.ssoProvider).values({
        id: createId("ssoProvider"),
        providerId,
        issuer: idp.entityId,
        domain: input.domain.toLowerCase(),
        organizationId: input.workspaceId,
        userId: ctx.user.id,
        samlConfig: JSON.stringify({
          issuer: idp.entityId,
          entryPoint: idp.entryPoint,
          cert: idp.cert,
          callbackUrl: `${env.BETTER_AUTH_URL}/api/auth/sso/saml2/callback/${providerId}`,
          audience: sp,
          wantAssertionsSigned: true,
          signatureAlgorithm: "sha256",
          identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
          mapping,
          idpMetadata: { entityID: idp.entityId, cert: idp.cert, entryPoint: idp.entryPoint },
          spMetadata: {
            entityID: sp,
            callbackUrl: `${env.BETTER_AUTH_URL}/api/auth/sso/saml2/callback/${providerId}`,
          },
        }),
      });

      await writeAudit({
        workspaceId: input.workspaceId,
        action: "sso.configured",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.workspaceId,
        ip: ipFromHeaders(ctx.headers),
        metadata: { issuer: idp.entityId, domain: input.domain.toLowerCase() },
      });

      logger.info("workspace.ssoUpsert", `${input.workspaceId} -> ${idp.entityId}`);
      return { providerId, issuer: idp.entityId };
    }),

  // directory sync status. the token itself is stored hashed and is shown once
  // at generation, so there is nothing here to give back.
  scimGet: enforceRole("workspaceSettings", "view").query(async ({ ctx, input }) => {
    if (!env.SSO_ENABLED) return { enabled: false as const, connected: false };
    const [row] = await ctx.db
      .select({ providerId: schema.scimProvider.providerId })
      .from(schema.scimProvider)
      .where(eq(schema.scimProvider.organizationId, input.workspaceId))
      .limit(1);
    return { enabled: true as const, connected: !!row, providerId: row?.providerId ?? null };
  }),

  // minted server-side rather than letting the client call the plugin directly:
  // the audit row has to be written by whoever actually issues the credential,
  // or a client that skips the follow-up call leaves no trail.
  //
  // the token is returned ONCE. it is stored hashed, so it cannot be shown again.
  scimGenerate: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!env.SSO_ENABLED) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "SSO is not enabled." });
      }
      if (ctx.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only an owner can enable directory sync.",
        });
      }
      await requirePremiumPlan(ctx.db, input.workspaceId, "Directory sync");

      // must not collide with the sso providerId (ws-...), which the plugin
      // rejects outright. regenerating replaces the old row, so the previous
      // token stops working the moment a new one is issued.
      const providerId = `scim-${input.workspaceId}`;
      await ctx.db
        .delete(schema.scimProvider)
        .where(eq(schema.scimProvider.organizationId, input.workspaceId));

      const result = await auth.api.generateSCIMToken({
        headers: ctx.headers,
        body: { providerId, organizationId: input.workspaceId },
      });

      await writeAudit({
        workspaceId: input.workspaceId,
        action: "scim.enabled",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.workspaceId,
        ip: ipFromHeaders(ctx.headers),
        metadata: { providerId },
      });

      logger.info("workspace.scimGenerate", `${input.workspaceId} token issued`);
      return { scimToken: result.scimToken };
    }),

  scimRevoke: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only an owner can disable directory sync.",
        });
      }
      const [removed] = await ctx.db
        .delete(schema.scimProvider)
        .where(eq(schema.scimProvider.organizationId, input.workspaceId))
        .returning({ providerId: schema.scimProvider.providerId });

      if (removed) {
        await writeAudit({
          workspaceId: input.workspaceId,
          action: "scim.disabled",
          actorType: "user",
          actorId: ctx.user.id,
          targetRef: input.workspaceId,
          ip: ipFromHeaders(ctx.headers),
          metadata: { providerId: removed.providerId },
        });
      }
      return { removed: !!removed };
    }),

  ssoDelete: workspaceProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only an owner can remove SSO." });
      }
      const [removed] = await ctx.db
        .delete(schema.ssoProvider)
        .where(eq(schema.ssoProvider.organizationId, input.workspaceId))
        .returning({ issuer: schema.ssoProvider.issuer });

      if (removed) {
        await writeAudit({
          workspaceId: input.workspaceId,
          action: "sso.removed",
          actorType: "user",
          actorId: ctx.user.id,
          targetRef: input.workspaceId,
          ip: ipFromHeaders(ctx.headers),
          metadata: { issuer: removed.issuer },
        });
      }
      return { removed: !!removed };
    }),
});

// the stored samlConfig is a json blob owned by the plugin, so read it
// defensively rather than trusting a shape we do not control.
function parseSamlCert(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const cert = (JSON.parse(raw) as { cert?: unknown }).cert;
    return typeof cert === "string" ? cert : null;
  } catch {
    return null;
  }
}

function parseSamlEntryPoint(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const entry = (JSON.parse(raw) as { entryPoint?: unknown }).entryPoint;
    return typeof entry === "string" ? entry : null;
  } catch {
    return null;
  }
}
