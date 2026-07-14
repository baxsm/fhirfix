"use client";

import { magicLinkClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { env } from "./env";
import { ac, roles } from "./permissions";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
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
