"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useListOrganizations, useSession } from "@/lib/auth-client";

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

  return <div className="min-h-svh bg-background" />;
}
