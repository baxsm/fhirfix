import { hasCreditFloor } from "@shared/db/credits";
import { ensureBillingAccount } from "@shared/db/ledger";
import { initTRPC, TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { hasPermission, type WorkspaceRole } from "@/auth/permissions";
import { schema } from "@/lib/db";
import type { TRPCContext } from "./context";

export const OUT_OF_CREDITS = "OUT_OF_CREDITS";

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

// requires a signed-in user.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to continue." });
  }
  return next({ ctx: { ...ctx, user: ctx.user, session: ctx.session } });
});

export const workspaceProcedure = protectedProcedure
  .input((raw): { workspaceId: string } => {
    if (
      typeof raw === "object" &&
      raw !== null &&
      "workspaceId" in raw &&
      typeof (raw as { workspaceId: unknown }).workspaceId === "string"
    ) {
      return raw as { workspaceId: string };
    }
    throw new TRPCError({ code: "BAD_REQUEST", message: "workspaceId is required." });
  })
  .use(async ({ ctx, input, next }) => {
    const [membership] = await ctx.db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, input.workspaceId),
          eq(schema.member.userId, ctx.user.id),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have access to this workspace.",
      });
    }

    return next({
      ctx: { ...ctx, workspaceId: input.workspaceId, role: membership.role as WorkspaceRole },
    });
  });

export const creditGatedProcedure = workspaceProcedure.use(async ({ ctx, next }) => {
  const account = await ensureBillingAccount(ctx.db, ctx.workspaceId);
  // shared floor check (db/credits.ts): balance positive, or auto-recharge covers.
  if (!hasCreditFloor(account)) {
    throw new TRPCError({ code: "FORBIDDEN", message: OUT_OF_CREDITS });
  }
  return next({ ctx });
});

type Resource = Parameters<typeof hasPermission>[1];
type Action = Parameters<typeof hasPermission>[2];

// gate a workspace procedure on a specific resource+action for the caller's role.
export function enforceRole(resource: Resource, action: Action) {
  return workspaceProcedure.use(({ ctx, next }) => {
    if (!hasPermission(ctx.role, resource, action)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your role does not allow this action.",
      });
    }
    return next({ ctx });
  });
}
