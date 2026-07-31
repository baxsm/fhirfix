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

  // absent credentials mean the key is simply not registered, so better-auth
  // 404s /callback/google rather than half-offering a provider.
  socialProviders: env.GOOGLE_ENABLED
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},

  // a google account arrives with a verified email, so the address is already
  // proven and must not be sent through our own verification flow.
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

  // a login is an auditable event, but it is not a trpc mutation. a session row
  // is created on every sign-in path (password, magic link, verification), so
  // hooking session creation catches all of them in one place.
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
    // enterprise sso. off unless switched on, because an unconfigured provider
    // would still expose /sso/* endpoints that can only fail.
    //
    // trustEmailVerified: an assertion from a workspace's configured corporate
    // IdP IS the proof of the address. without this the plugin hardcodes
    // emailVerified=false, which would send an SSO user through our own email
    // verification and defeat the point of single sign-on. it only applies to
    // providers an admin registered, and only when the provider maps the field.
    ...(env.SSO_ENABLED
      ? [
          sso({ trustEmailVerified: true }),
          // directory provisioning rides on the same switch as sso: an IdP that
          // pushes users is the same IdP that authenticates them.
          //
          // storeSCIMToken "hashed": the token is a bearer credential with the
          // power to create and deactivate members, so the database keeps only
          // a hash. the plugin's default is weaker; a leaked row must not be
          // replayable. requiredRole owner matches ssoUpsert.
          scim({ storeSCIMToken: "hashed", requiredRole: ["owner"] }),
          // required BY scim, not wanted for its own sake. SCIM `active: false`
          // maps to this plugin's `banned` field, the only enforced
          // disabled-user state in better-auth, and the scim plugin rejects a
          // deactivation it cannot honour rather than dropping it silently.
          // deprovisioning is the whole point of scim, so this is not optional.
          // adminRoles is empty: no one gets app-wide admin powers from it.
          admin({ adminRoles: [] }),
        ]
      : []),
  ],
});

export type Auth = typeof auth;
