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

  // not signed in -> sign in.
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

  if (sessionPending || orgsQuery.isPending) {
    return <ShellSkeleton />;
  }

  if (!session) return <ShellSkeleton />;

  // signed in but the slug is not a workspace they belong to.
  if (!active) {
    return <WorkspaceNotFound />;
  }

  const role = (wsQuery.data?.role ?? "member") as WorkspaceRole;

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
          workspaceName={active.name}
          user={{ name: session.user.name, email: session.user.email }}
        />
        <LowBalanceBanner workspace={workspace} workspaceId={active.id} />
        <main className="min-w-0 flex-1 p-5 sm:p-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-svh">
      <div className="hidden w-64 shrink-0 border-r p-4 lg:block">
        <Skeleton className="h-12 w-full" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center border-b px-4">
          <Skeleton className="ml-auto h-8 w-28" />
        </div>
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
