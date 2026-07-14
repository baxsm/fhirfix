"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <div className="mx-auto max-w-md space-y-4 p-10">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
