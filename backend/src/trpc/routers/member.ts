import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { auth } from "@/auth/auth";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { enforceRole, router, workspaceProcedure } from "../trpc";

const roleEnum = z.enum(["owner", "admin", "member", "billing", "auditor"]);

export const memberRouter = router({
  list: workspaceProcedure.query(async ({ ctx, input }) => {
    const result = await auth.api.listMembers({
      headers: ctx.headers,
      query: { organizationId: input.workspaceId },
    });
    return result;
  }),

  invite: enforceRole("member", "create")
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.email(),
        role: roleEnum.default("member"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invitation = await auth.api.createInvitation({
        headers: ctx.headers,
        body: {
          email: input.email,
          role: input.role,
          organizationId: input.workspaceId,
        },
      });
      await writeAudit({
        workspaceId: input.workspaceId,
        action: "member.invited",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.email,
        ip: ipFromHeaders(ctx.headers),
        metadata: { role: input.role },
      });
      return invitation;
    }),

  updateRole: enforceRole("member", "update")
    .input(
      z.object({
        workspaceId: z.string(),
        memberId: z.string(),
        role: roleEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // only owner can grant owner. guard beyond the coarse enforceRole gate.
      if (input.role === "owner" && ctx.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only an owner can assign the owner role.",
        });
      }
      const updated = await auth.api.updateMemberRole({
        headers: ctx.headers,
        body: {
          memberId: input.memberId,
          role: input.role,
          organizationId: input.workspaceId,
        },
      });
      await writeAudit({
        workspaceId: input.workspaceId,
        action: "member.role_changed",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.memberId,
        ip: ipFromHeaders(ctx.headers),
        metadata: { role: input.role },
      });
      return updated;
    }),

  remove: enforceRole("member", "delete")
    .input(z.object({ workspaceId: z.string(), memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await auth.api.removeMember({
        headers: ctx.headers,
        body: { memberIdOrEmail: input.memberId, organizationId: input.workspaceId },
      });
      await writeAudit({
        workspaceId: input.workspaceId,
        action: "member.removed",
        actorType: "user",
        actorId: ctx.user.id,
        targetRef: input.memberId,
        ip: ipFromHeaders(ctx.headers),
      });
      return result;
    }),
});
