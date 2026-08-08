"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { signOut, useListOrganizations, useSession } from "@/lib/auth-client";

export function AppEntry() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: orgs, isPending: orgsPending } = useListOrganizations();
  const leaving = useRef(false);

  useEffect(() => {
    if (sessionPending || orgsPending || leaving.current) return;
    leaving.current = true;

    // the cookie outlives the session row, and proxy.ts redirects on the cookie
    // alone, so signing out first is what stops /sign-in bouncing back to here
    if (!session) {
      signOut()
        .catch(() => {})
        .finally(() => router.replace("/sign-in"));
      return;
    }

    const first = orgs?.[0];
    router.replace(first ? `/app/${first.slug}` : "/app/new");
  }, [sessionPending, orgsPending, session, orgs, router]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Opening your workspace...</p>
    </div>
  );
}
