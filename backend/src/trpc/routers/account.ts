import { z } from "zod";
import { auth } from "@/auth/auth";
import { protectedProcedure, router } from "../trpc";

// only flags something actually reads: per-check notifications have no user-level toggle
const notificationPrefsSchema = z.object({
  lowBalance: z.boolean().default(true),
});

type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

const defaultPrefs: NotificationPrefs = {
  lowBalance: true,
};

function parsePrefs(raw: unknown): NotificationPrefs {
  if (typeof raw !== "string" || raw.length === 0) return defaultPrefs;
  try {
    // malformed json falls back to defaults rather than throwing
    return notificationPrefsSchema.parse(JSON.parse(raw));
  } catch {
    return defaultPrefs;
  }
}

export const accountRouter = router({
  get: protectedProcedure.query(({ ctx }) => {
    const { id, name, email, image, emailVerified } = ctx.user;
    const notificationPrefs = parsePrefs(
      (ctx.user as { notificationPrefs?: unknown }).notificationPrefs,
    );
    return { id, name, email, image, emailVerified, notificationPrefs };
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80).optional(),
        image: z.string().url().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await auth.api.updateUser({ headers: ctx.headers, body: input });
      return { ok: true };
    }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
        revokeOtherSessions: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await auth.api.changePassword({ headers: ctx.headers, body: input });
      return { ok: true };
    }),

  notificationPrefs: protectedProcedure
    .input(notificationPrefsSchema)
    .mutation(async ({ ctx, input }) => {
      await auth.api.updateUser({
        headers: ctx.headers,
        body: { notificationPrefs: JSON.stringify(input) },
      });
      return input;
    }),
});
