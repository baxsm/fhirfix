import { z } from "zod";
import { auth } from "@/auth/auth";
import { protectedProcedure, router } from "../trpc";

const notificationPrefsSchema = z.object({
  runComplete: z.boolean().default(true),
  driftAlerts: z.boolean().default(true),
  lowBalance: z.boolean().default(true),
  productUpdates: z.boolean().default(false),
});

type NotificationPrefs = z.infer<typeof notificationPrefsSchema>;

const defaultPrefs: NotificationPrefs = {
  runComplete: true,
  driftAlerts: true,
  lowBalance: true,
  productUpdates: false,
};

function parsePrefs(raw: unknown): NotificationPrefs {
  if (typeof raw !== "string" || raw.length === 0) return defaultPrefs;
  try {
    return notificationPrefsSchema.parse(JSON.parse(raw));
  } catch {
    return defaultPrefs;
  }
}

// account router: the signed-in user's OWN profile. never workspace-scoped,
// reachable by any member regardless of workspace role.
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
