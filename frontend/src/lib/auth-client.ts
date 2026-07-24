"use client";

import { magicLinkClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "./env";
import { ac, roles } from "./permissions";

// same-origin on purpose. next.config rewrites /api/auth/* to the backend, so
// the browser makes a first-party request and keeps the session cookie on this
// domain. pointing this at the backend host directly would make the cookie
// third-party and unreadable by the next.js server.
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? env.NEXT_PUBLIC_API_URL : window.location.origin,
  plugins: [organizationClient({ ac, roles }), magicLinkClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  organization,
  useListOrganizations,
  useActiveOrganization,
} = authClient;
