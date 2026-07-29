import { z } from "zod";
import { auth } from "@/auth/auth";
import { protectedProcedure, router } from "../trpc";

// only flags that something actually reads belong here. run-completion and
// drift notifications are delivered to per-check channels, not to a user
// account, so a per-user toggle for them would control nothing.
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
    // blobs written before the schema narrowed carry extra keys. zod strips
    // them, but a hard parse on malformed json still falls back to defaults.
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
