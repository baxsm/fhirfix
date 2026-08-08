import { scim } from "@better-auth/scim";
import { sso } from "@better-auth/sso";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink, organization } from "better-auth/plugins";
import { recordLogin } from "@/lib/audit";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { magicLinkEmail, resetPasswordEmail, verificationEmail } from "./emails";
import { ac, roles } from "./permissions";

export const auth = betterAuth({
  appName: "FHIRfix",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: env.TRUSTED_ORIGIN_LIST,

  database: drizzleAdapter(db, { provider: "pg" }),

  user: {
    additionalFields: {
      // per-user notification preferences. jsonb blob, app-defined shape.
      notificationPrefs: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  // absent credentials leave the provider unregistered rather than half-offered
  socialProviders: env.GOOGLE_ENABLED
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},

  // a google address is already proven and must not enter our own verification flow
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const { subject, html, text } = resetPasswordEmail(url);
      await sendEmail({ to: user.email, subject, html, text });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { subject, html, text } = verificationEmail(url);
      await sendEmail({ to: user.email, subject, html, text });
    },
  },

  // hooks session creation because every sign-in path creates one, unlike a trpc mutation
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await recordLogin({ userId: session.userId, ip: session.ipAddress ?? null });
        },
      },
    },
  },

  // cross-origin dashboard: cookies must survive frontend -> backend calls
  advanced: {
    defaultCookieAttributes: {
      sameSite: env.IS_PRODUCTION ? "none" : "lax",
      secure: env.IS_PRODUCTION,
    },
  },

  plugins: [
    organization({
      ac,
      roles,
      sendInvitationEmail: async ({ email, invitation, organization: org }) => {
        const url = `${env.TRUSTED_ORIGIN_LIST[0]}/accept-invite/${invitation.id}`;
        const { subject, html, text } = magicLinkEmail(url, org.name);
        await sendEmail({ to: email, subject, html, text });
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { subject, html, text } = magicLinkEmail(url);
        await sendEmail({ to: email, subject, html, text });
      },
    }),
    // trustEmailVerified must stay on or an IdP-asserted address is re-verified by us
    ...(env.SSO_ENABLED
      ? [
          sso({ trustEmailVerified: true }),
          // must stay "hashed": the token deactivates members, so a leaked row is replayable
          scim({ storeSCIMToken: "hashed", requiredRole: ["owner"] }),
          // required by scim: `active: false` maps to this plugin's `banned` field
          admin({ adminRoles: [] }),
        ]
      : []),
  ],
});

export type Auth = typeof auth;
