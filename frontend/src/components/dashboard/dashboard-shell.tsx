"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LowBalanceBanner } from "@/components/billing/low-balance-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import type { WorkspaceRole } from "@/lib/permissions";
import { useTRPC } from "@/trpc/client";
import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";
import { WorkspaceNotFound } from "./workspace-not-found";

export function DashboardShell({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  // proxy.ts already redirects signed-out users before this renders. this is the
  // fallback for a session that expires while the tab is open.
  useEffect(() => {
    if (!sessionPending && !session) router.replace("/sign-in");
  }, [sessionPending, session, router]);

  // resolve the workspace list from the server (tRPC), not the Better Auth
  // client cache, so a just-created workspace is visible without a stale race.
  const trpc = useTRPC();
  const orgsQuery = useQuery({
    ...trpc.workspace.list.queryOptions(),
    enabled: !!session,
  });
  const orgs = orgsQuery.data;
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);

  const wsQuery = useQuery({
    ...trpc.workspace.get.queryOptions({ workspaceId: active?.id ?? "" }),
    enabled: !!active?.id,
  });

  // the slug is in the url, so the workspace name is knowable before the query
  // resolves. showing a readable placeholder beats a grey block that then
  // repaints into the same layout.
  const resolving = sessionPending || orgsQuery.isPending;

  // only decide "not your workspace" once the list actually arrived. doing this
  // while pending would flash the not-found screen on every cold load.
  if (!resolving && session && !active) {
    return <WorkspaceNotFound />;
  }

  const role = (wsQuery.data?.role ?? "member") as WorkspaceRole;

  // the sidebar and topbar are static chrome - they never depended on the
  // network. painting them immediately and confining the pending state to the
  // content area is what removes the full-page skeleton -> full-page repaint.
  return (
    <SidebarProvider>
      <AppSidebar
        workspace={workspace}
        role={role}
        workspaces={orgs?.map((o) => ({ id: o.id, name: o.name, slug: o.slug })) ?? []}
      />
      <SidebarInset className="min-w-0">
        <Topbar
          workspace={workspace}
          workspaceName={active?.name ?? slugToName(workspace)}
          user={{
            name: session?.user.name ?? "",
            email: session?.user.email ?? "",
          }}
        />
        {active && <LowBalanceBanner workspace={workspace} workspaceId={active.id} />}
        <main className="min-w-0 flex-1 p-5 sm:p-7">
          {resolving ? <ContentSkeleton /> : children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// "phase2-health" -> "Phase2 Health". only used for the split second before the
// real workspace name arrives, so the topbar has readable text instead of a bar.
function slugToName(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-44" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}
