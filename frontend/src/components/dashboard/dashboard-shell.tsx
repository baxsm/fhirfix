"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LowBalanceBanner } from "@/components/billing/low-balance-banner";
import { useSession } from "@/lib/auth-client";
import type { WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { AppSidebar } from "./app-sidebar";
import { contentInset } from "./page-container";
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

  useEffect(() => {
    if (!sessionPending && !session) router.replace("/sign-in");
  }, [sessionPending, session, router]);

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

  const resolving = sessionPending || orgsQuery.isPending;

  if (!resolving && session && !active) {
    return <WorkspaceNotFound />;
  }

  const role = (wsQuery.data?.role ?? "member") as WorkspaceRole;

  return (
    <div className="app-shell flex h-svh gap-2 bg-canvas p-2 sm:gap-2.5 sm:p-2.5">
      <AppSidebar
        workspace={workspace}
        role={role}
        workspaces={orgs?.map((o) => ({ id: o.id, name: o.name, slug: o.slug })) ?? []}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          workspace={workspace}
          workspaceName={active?.name ?? slugToName(workspace)}
          role={role}
          user={{
            name: session?.user.name ?? "",
            email: session?.user.email ?? "",
          }}
        />
        {active && <LowBalanceBanner workspace={workspace} workspaceId={active.id} />}
        {/* children render immediately. the shell used to swap the whole page for a skeleton whenever */}
        <main className={cn("min-w-0 flex-1 overflow-auto pt-5 pb-8", contentInset)}>
          {children}
        </main>
      </div>
    </div>
  );
}

function slugToName(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
