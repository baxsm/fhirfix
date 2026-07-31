"use client";

import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsSection } from "@/components/dashboard/settings-section";
import { LoadError } from "@/components/ui/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrganizations } from "@/lib/auth-client";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { useTRPC } from "@/trpc/client";
import { ApiKeysSection } from "./api-keys-section";
import { RecentRequestLogs } from "./request-logs-section";
import { WebhooksSection } from "./webhooks-section";

export function DevelopersView({
  workspace,
  workspaceId: serverWorkspaceId,
}: {
  workspace: string;
  workspaceId?: string;
}) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

  const trpc = useTRPC();
  const wsQuery = useQuery({
    ...trpc.workspace.get.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });
  const role = (wsQuery.data?.role ?? "member") as WorkspaceRole;
  const canManage = can(role, "apiKey", "create");

  return (
    <PageContainer>
      <PageHeader
        title="API access"
        description={`Keys, webhooks, and request logs for the FHIRfix REST API in ${active?.name ?? "this workspace"}.`}
      />

      {wsQuery.isError ? (
        <LoadError what="developer settings" onRetry={() => wsQuery.refetch()} />
      ) : wsQuery.isPending || !workspaceId ? (
        <DevelopersSkeleton />
      ) : (
        <>
          <SettingsSection
            title="API keys"
            description="Authenticate REST requests with a Bearer key. Keep live keys secret."
          >
            <ApiKeysSection workspaceId={workspaceId} canManage={canManage} />
          </SettingsSection>

          <SettingsSection
            title="Webhooks"
            description="Get a signed POST when a run completes or fails, so you can react without polling."
          >
            <WebhooksSection workspaceId={workspaceId} canManage={canManage} />
          </SettingsSection>

          {/* the recent slice only. the filters and paging moved to the full logs page */}
          <SettingsSection
            title="Recent requests"
            description="The last few REST calls this workspace made, including ones that never started a run."
          >
            <RecentRequestLogs workspaceId={workspaceId} workspace={workspace} />
          </SettingsSection>
        </>
      )}
    </PageContainer>
  );
}

function DevelopersSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
