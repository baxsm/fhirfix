import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/auth/permissions";
import { generateKey } from "@/lib/api-key";
import { schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { logger } from "@/lib/logger";
import { router, workspaceProcedure } from "../trpc";

// the scopes a key can hold. mappings write needs the admin-only mapping scope.
const KEY_SCOPES = ["validate", "convert", "fix", "runs", "mappings"] as const;

function requireKeyPermission(role: string, action: "create" | "revoke") {
  if (!hasPermission(role as never, "apiKey", action)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your role cannot manage API keys." });
  }
}

export const developersRouter = router({
  apiKeys: router({
    // masked list: prefix + metadata only, never the hash or full key. ordered
    // newest first, revoked keys included (shown struck-through in the ui).
    list: workspaceProcedure.query(async ({ ctx }) => {
      return ctx.db
        .select({
          id: schema.apiKey.id,
          name: schema.apiKey.name,
          prefix: schema.apiKey.prefix,
          mode: schema.apiKey.mode,
          scopes: schema.apiKey.scopes,
          createdAt: schema.apiKey.createdAt,
          lastUsedAt: schema.apiKey.lastUsedAt,
          revokedAt: schema.apiKey.revokedAt,
        })
        .from(schema.apiKey)
        .where(eq(schema.apiKey.workspaceId, ctx.workspaceId))
        .orderBy(desc(schema.apiKey.createdAt));
    }),

    // create a key. the full secret is returned ONCE here and never again; only
    // the keyed hash is stored. the client must copy it now.
    create: workspaceProcedure
      .input(
        z.object({
          workspaceId: z.string(),
          name: z.string().min(1).max(80),
          mode: z.enum(["test", "live"]),
          scopes: z.array(z.enum(KEY_SCOPES)).min(1).default(["validate", "convert", "fix"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireKeyPermission(ctx.role, "create");
        const { full, prefix, hash } = generateKey(input.mode);
        const id = createId("apiKey");
        await ctx.db.insert(schema.apiKey).values({
          id,
          workspaceId: ctx.workspaceId,
          name: input.name,
          prefix,
          hashedKey: hash,
          mode: input.mode,
          scopes: input.scopes,
          createdBy: ctx.user.id,
        });
        // audit_log lands in phase 8; until then a structured log line is the trail.
        logger.info(
          "apikey.created",
          `${id} (${input.mode}) in ${ctx.workspaceId} by ${ctx.user.id}`,
        );
        return { id, name: input.name, mode: input.mode, prefix, key: full };
      }),

    // revoke a key immediately. a revoked key fails auth at resolveApiKey. we keep
    // the row (masked) so it stays visible in the list as revoked.
    revoke: workspaceProcedure
      .input(z.object({ workspaceId: z.string(), keyId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        requireKeyPermission(ctx.role, "revoke");
        const res = await ctx.db
          .update(schema.apiKey)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(schema.apiKey.id, input.keyId),
              eq(schema.apiKey.workspaceId, ctx.workspaceId),
              // revoking an already-revoked key is a no-op, not an error.
            ),
          )
          .returning({ id: schema.apiKey.id, revokedAt: schema.apiKey.revokedAt });
        if (res.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "API key not found." });
        }
        logger.info("apikey.revoked", `${input.keyId} in ${ctx.workspaceId} by ${ctx.user.id}`);
        return { revoked: true };
      }),
  }),
});
