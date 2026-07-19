"use client";

import { useQuery } from "@tanstack/react-query";
import { Map } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrganizations } from "@/lib/auth-client";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { useTRPC } from "@/trpc/client";
import { MappingsTable } from "./mappings-table";
import type { MappingStatus } from "./types";

// the registry is one table under a status filter rather than three separate
// lists: the columns are identical and the whole point is that a suggestion
// becomes an active mapping, so switching views should not reshuffle the layout.
const FILTERS: { key: MappingStatus; label: string }[] = [
  { key: "suggested", label: "Suggestions" },
  { key: "active", label: "Active" },
  { key: "deprecated", label: "Deprecated" },
  { key: "rejected", label: "Rejected" },
];

export function MappingsView({ workspace }: { workspace: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  const trpc = useTRPC();
  const wsQuery = useQuery({
    ...trpc.workspace.get.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });
  const role = (wsQuery.data?.role ?? "member") as WorkspaceRole;
  const canEdit = can(role, "mapping", "create");
  const canApprove = can(role, "mapping", "approve");
  const canDeprecate = can(role, "mapping", "deprecate");

  const countsQuery = useQuery({
    ...trpc.mappings.counts.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });
  const counts = countsQuery.data;

  // land on suggestions when any are pending: that is the only view with work
  // waiting in it. otherwise the active registry is the useful default.
  //
  // resolved once, when counts first arrive, and never again. deriving it on
  // every render instead means approving the last suggestion drops the count to
  // zero and yanks the user to a different tab mid-task.
  const [status, setStatus] = useState<MappingStatus | null>(null);
  const [defaulted, setDefaulted] = useState(false);
  useEffect(() => {
    if (defaulted || !counts) return;
    setStatus(counts.suggested > 0 ? "suggested" : "active");
    setDefaulted(true);
  }, [counts, defaulted]);
  const effectiveStatus: MappingStatus = status ?? "active";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Mappings</h1>
        <p className="text-sm text-muted-foreground">
          The versioned registry of assigning-authority and code mappings that power auto-fixes in{" "}
          <span className="font-medium text-foreground">{active?.name ?? "this workspace"}</span>.
        </p>
      </header>

      {/* isPending, not isLoading: a background refetch must not unmount the
          table, or every mutation resets the user's filter and search. */}
      {wsQuery.isError ? (
        <ViewError onRetry={() => wsQuery.refetch()} />
      ) : wsQuery.isPending || !workspaceId ? (
        <Skeleton className="h-96 w-full rounded-xl" />
      ) : (
        <MappingsTable
          workspaceId={workspaceId}
          status={effectiveStatus}
          onStatusChange={setStatus}
          filters={FILTERS}
          counts={counts}
          onCountsChange={() => countsQuery.refetch()}
          canEdit={canEdit}
          canApprove={canApprove}
          canDeprecate={canDeprecate}
        />
      )}
    </div>
  );
}

function ViewError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="raised flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
      <Map className="size-8 text-muted-foreground" />
      <h2 className="font-medium">Could not load mappings</h2>
      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
