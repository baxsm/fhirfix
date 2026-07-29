"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrganizations } from "@/lib/auth-client";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { useTRPC } from "@/trpc/client";
import { MappingsTable } from "./mappings-table";
import type { MappingStatus } from "./types";

const FILTERS: { key: MappingStatus; label: string }[] = [
  { key: "suggested", label: "Suggestions" },
  { key: "active", label: "Active" },
  { key: "deprecated", label: "Deprecated" },
  { key: "rejected", label: "Rejected" },
];

export function MappingsView({
  workspace,
  workspaceId: serverWorkspaceId,
  initialStatus = "active",
}: {
  workspace: string;
  workspaceId?: string;
  initialStatus?: MappingStatus;
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
  const canEdit = can(role, "mapping", "create");
  const canApprove = can(role, "mapping", "approve");
  const canDeprecate = can(role, "mapping", "deprecate");

  const [status, setStatus] = useState<MappingStatus>(initialStatus);

  return (
    <PageContainer width="full">
      <PageHeader
        title="Mapping rules"
        description={`The versioned registry of assigning-authority and code mappings that power auto-fixes in ${active?.name ?? "this workspace"}.`}
      />

      {/* gated on workspaceId only: it arrives from the server, so there is no client waterfall */}
      {wsQuery.isError && !workspaceId ? (
        <ViewError onRetry={() => wsQuery.refetch()} />
      ) : !workspaceId ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <MappingsTable
          workspaceId={workspaceId}
          status={status}
          onStatusChange={setStatus}
          filters={FILTERS}
          canEdit={canEdit}
          canApprove={canApprove}
          canDeprecate={canDeprecate}
        />
      )}
    </PageContainer>
  );
}

function ViewError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-14 text-center">
      <h2 className="text-sm font-medium">Could not load mappings</h2>
      <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
