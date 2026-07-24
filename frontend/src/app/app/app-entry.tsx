"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useListOrganizations, useSession } from "@/lib/auth-client";

// /app resolves where to send the user: sign-in if logged out, first-run
// workspace creation if they have none, otherwise their first workspace.
export function AppEntry() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: orgs, isPending: orgsPending } = useListOrganizations();

  useEffect(() => {
    if (sessionPending || orgsPending) return;
    if (!session) {
      router.replace("/sign-in");
      return;
    }
    const first = orgs?.[0];
    router.replace(first ? `/app/${first.slug}` : "/app/new");
  }, [sessionPending, orgsPending, session, orgs, router]);

  // this route only ever resolves and redirects. rendering skeleton "content"
  // here made it look like a real page loading, which it never is. a bare
  // surface reads as a transition instead of a page that failed to fill in.
  return <div className="min-h-svh bg-background" />;
}
