"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { LoadError } from "@/components/ui/load-error";
import { PanelTab, PanelTabs } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrganizations } from "@/lib/auth-client";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { useTRPC } from "@/trpc/client";
import { AlertFeed } from "./alert-feed";
import { ChecksTable } from "./checks-table";

type Panel = "checks" | "alerts";

export function MonitoringView({
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
  const canManage = can(role, "monitoring", "manage");

  const countsQuery = useQuery({
    ...trpc.monitoring.alertCounts.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });
  const openAlerts = countsQuery.data?.open ?? 0;

  const [panel, setPanel] = useState<Panel>("checks");

  return (
    <PageContainer width="full">
      <PageHeader
        title="Scheduled checks"
        description={`Validate your endpoints on a schedule and get told when conformance drops in ${active?.name ?? "this workspace"}.`}
      />

      {wsQuery.isError ? (
        <LoadError what="monitoring" onRetry={() => wsQuery.refetch()} />
      ) : wsQuery.isPending || !workspaceId ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <div className="space-y-4">
          <PanelTabs label="Monitoring sections">
            <PanelTab active={panel === "checks"} onClick={() => setPanel("checks")}>
              Checks
            </PanelTab>
            <PanelTab
              active={panel === "alerts"}
              count={openAlerts || undefined}
              onClick={() => setPanel("alerts")}
            >
              Drift alerts
            </PanelTab>
          </PanelTabs>

          {panel === "checks" ? (
            <ChecksTable
              workspace={workspace}
              workspaceId={workspaceId}
              canManage={canManage}
              onChanged={() => countsQuery.refetch()}
            />
          ) : (
            <AlertFeed
              workspace={workspace}
              workspaceId={workspaceId}
              canManage={canManage}
              onChanged={() => countsQuery.refetch()}
            />
          )}
        </div>
      )}
    </PageContainer>
  );
}
