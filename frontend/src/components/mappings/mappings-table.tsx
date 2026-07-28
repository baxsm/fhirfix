"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownUp, Check, Map, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PendingRows } from "@/components/ui/pending-rows";
import { PanelTab, PanelTabs } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { CreateMappingDialog } from "./create-mapping-dialog";
import { EditMappingDialog } from "./edit-mapping-dialog";
import { ImportExportDialog } from "./import-export-dialog";
import { MappingHistoryDialog } from "./mapping-history-dialog";
import { type MappingRow, type MappingStatus, TYPE_LABELS } from "./types";

interface Counts {
  active: number;
  suggested: number;
  deprecated: number;
  rejected: number;
}

export function MappingsTable({
  workspaceId,
  status,
  onStatusChange,
  filters,
  counts,
  onCountsChange,
  canEdit,
  canApprove,
  canDeprecate,
}: {
  workspaceId: string;
  status: MappingStatus;
  onStatusChange: (s: MappingStatus) => void;
  filters: { key: MappingStatus; label: string }[];
  counts: Counts | undefined;
  onCountsChange: () => void;
  canEdit: boolean;
  canApprove: boolean;
  canDeprecate: boolean;
}) {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MappingRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<MappingRow | null>(null);

  const query = useQuery({
    ...trpc.mappings.list.queryOptions({
      workspaceId,
      status,
      search: search.trim() || undefined,
    }),
    enabled: !!workspaceId,
  });

  const conflictsQuery = useQuery({
    ...trpc.mappings.conflicts.queryOptions({ workspaceId }),
    enabled: !!workspaceId && status === "active",
  });

  const overriddenBy: Record<string, { sourceSystem: string | null; targetValue: string }[]> = {};
  for (const c of conflictsQuery.data ?? []) {
    for (const loser of c.overridden) {
      const existing = overriddenBy[loser.id] ?? [];
      existing.push({ sourceSystem: c.winner.sourceSystem, targetValue: c.winner.targetValue });
      overriddenBy[loser.id] = existing;
    }
  }

  const refresh = () => {
    query.refetch();
    onCountsChange();
    conflictsQuery.refetch();
  };

  const approve = useMutation(
    trpc.mappings.approve.mutationOptions({
      onSuccess: () => {
        toast.success("Mapping approved. Future runs will apply it.");
        refresh();
      },
      onError: (e) => toast.error(e.message ?? "Could not approve the mapping."),
    }),
  );
  const reject = useMutation(
    trpc.mappings.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Suggestion rejected.");
        refresh();
      },
      onError: (e) => toast.error(e.message ?? "Could not reject the suggestion."),
    }),
  );
  const deprecate = useMutation(
    trpc.mappings.deprecate.mutationOptions({
      onSuccess: () => {
        toast.success("Mapping deprecated. Future runs will skip it.");
        refresh();
      },
      onError: (e) => toast.error(e.message ?? "Could not deprecate the mapping."),
    }),
  );
  const reactivate = useMutation(
    trpc.mappings.reactivate.mutationOptions({
      onSuccess: () => {
        toast.success("Mapping reactivated.");
        refresh();
      },
      onError: (e) => toast.error(e.message ?? "Could not reactivate the mapping."),
    }),
  );

  const rows = (query.data ?? []) as MappingRow[];
  const busy = approve.isPending || reject.isPending || deprecate.isPending || reactivate.isPending;

  return (
    <div className="space-y-4">
      {/* status swaps which rows the table shows and each carries its own count */}
      <PanelTabs
        label="Filter by status"
        actions={
          <>
            <div className="relative">
              <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search source or target"
                className="h-8 w-56 pl-8 text-xs"
              />
            </div>
            {/* import/export is an active-registry action */}
            {canEdit && status === "active" && (
              <Button variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowDownUp />
                Import / export
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                Add mapping
              </Button>
            )}
          </>
        }
      >
        {filters.map((f) => {
          const n = counts?.[f.key];
          return (
            <PanelTab
              key={f.key}
              active={status === f.key}
              count={n || undefined}
              onClick={() => onStatusChange(f.key)}
            >
              {f.label}
            </PanelTab>
          );
        })}
      </PanelTabs>

      {/* bg-card is load-bearing: `raised` only supplies a shadow, so without a surface the panel */}
      <div className="raised overflow-hidden rounded-md border bg-card">
        {query.isError ? (
          <ListError onRetry={() => query.refetch()} />
        ) : !query.isPending && rows.length === 0 ? (
          <EmptyState
            status={status}
            searching={!!search.trim()}
            canEdit={canEdit}
            onCreate={() => setCreateOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            {/* the header is static, so it stays mounted while rows load or the tab changes */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Target</th>
                  <th className="px-4 py-2 font-medium">Type</th>
                  <th className="px-4 py-2 font-medium">Scope</th>
                  <th className="px-4 py-2 font-medium">Version</th>
                  <th className="w-8 px-4 py-2" />
                </tr>
              </thead>
              {query.isPending ? (
                <PendingRows columns={6} />
              ) : (
                <tbody key={`${status}-${search}`} className="enter-stagger">
                  {rows.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-xs">{m.sourceValue}</code>
                          {m.status === "suggested" && m.confidence != null && (
                            <Badge
                              variant="outline"
                              className="border-warning/30 bg-warning/10 text-[10px] text-warning"
                            >
                              {m.confidence}% confident
                            </Badge>
                          )}
                        </div>
                        {m.createdBy === "system" && (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">Auto-learned</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <code className="break-all font-mono text-muted-foreground text-xs">
                          {m.targetValue}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{TYPE_LABELS[m.type]}</span>
                      </td>
                      <td className="px-4 py-3">
                        {m.scope === "source_system" ? (
                          <span
                            className="text-xs text-muted-foreground"
                            title={`Only applies to ${m.sourceSystem}`}
                          >
                            {m.sourceSystem}
                          </span>
                        ) : overriddenBy[m.id] ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-muted-foreground">Workspace</span>
                            <span
                              className="text-[11px] text-warning"
                              title={overriddenBy[m.id]
                                ?.map((w) => `${w.sourceSystem} uses ${w.targetValue}`)
                                .join("\n")}
                            >
                              Overridden on{" "}
                              {overriddenBy[m.id]?.map((w) => w.sourceSystem).join(", ")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Workspace</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setHistoryTarget(m)}
                          className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          title="View version history"
                        >
                          v{m.version}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowActions
                          row={m}
                          busy={busy}
                          canEdit={canEdit}
                          canApprove={canApprove}
                          canDeprecate={canDeprecate}
                          onApprove={() => approve.mutate({ workspaceId, mappingId: m.id })}
                          onReject={() => reject.mutate({ workspaceId, mappingId: m.id })}
                          onDeprecate={() => deprecate.mutate({ workspaceId, mappingId: m.id })}
                          onReactivate={() => reactivate.mutate({ workspaceId, mappingId: m.id })}
                          onEdit={() => setEditTarget(m)}
                          onHistory={() => setHistoryTarget(m)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </div>

      <CreateMappingDialog
        workspaceId={workspaceId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
      <ImportExportDialog
        workspaceId={workspaceId}
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onImported={refresh}
      />
      <EditMappingDialog
        workspaceId={workspaceId}
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={refresh}
      />
      <MappingHistoryDialog
        workspaceId={workspaceId}
        target={historyTarget}
        onOpenChange={(open) => !open && setHistoryTarget(null)}
      />
    </div>
  );
}

function RowActions({
  row,
  busy,
  canEdit,
  canApprove,
  canDeprecate,
  onApprove,
  onReject,
  onDeprecate,
  onReactivate,
  onEdit,
  onHistory,
}: {
  row: MappingRow;
  busy: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canDeprecate: boolean;
  onApprove: () => void;
  onReject: () => void;
  onDeprecate: () => void;
  onReactivate: () => void;
  onEdit: () => void;
  onHistory: () => void;
}) {
  if (row.status === "suggested" && canApprove) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <Button
          variant="outline"
          size="sm"
          aria-label={`Approve mapping for ${row.sourceValue}`}
          disabled={busy}
          onClick={onApprove}
        >
          <Check className="text-success" />
          Approve
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Reject suggestion for ${row.sourceValue}`}
          title="Reject"
          disabled={busy}
          onClick={onReject}
        >
          <X className="text-muted-foreground" />
        </Button>
      </div>
    );
  }

  const items: { label: string; onSelect: () => void; destructive?: boolean }[] = [];
  if (row.status === "active" && canEdit) items.push({ label: "Edit mapping", onSelect: onEdit });
  items.push({ label: "View history", onSelect: onHistory });
  if (row.status === "active" && canDeprecate) {
    items.push({ label: "Deprecate", onSelect: onDeprecate, destructive: true });
  }
  if (row.status === "deprecated" && canApprove) {
    items.push({ label: "Reactivate", onSelect: onReactivate });
  }
  if (items.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${row.sourceValue}`}
          disabled={busy}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((i) => (
          <DropdownMenuItem
            key={i.label}
            variant={i.destructive ? "destructive" : undefined}
            onSelect={i.onSelect}
          >
            {i.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const EMPTY_COPY: Record<MappingStatus, { title: string; body: string }> = {
  suggested: {
    title: "No suggestions pending",
    body: "When a run hits an authority or code the registry does not know, it proposes a mapping here for review.",
  },
  active: {
    title: "No active mappings",
    body: "Add a mapping, or approve a suggestion, and every future run will auto-fix that value.",
  },
  deprecated: {
    title: "Nothing deprecated",
    body: "Retired mappings land here. They stop applying to new runs but stay readable in past reports.",
  },
  rejected: {
    title: "Nothing rejected",
    body: "Suggestions you turn down are kept here so the same one is not proposed again.",
  },
};

function EmptyState({
  status,
  searching,
  canEdit,
  onCreate,
}: {
  status: MappingStatus;
  searching: boolean;
  canEdit: boolean;
  onCreate: () => void;
}) {
  if (searching) {
    return (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Search className="size-7 text-muted-foreground" />
        <p className="text-sm font-medium">No mappings match that search</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Try a different source or target value.
        </p>
      </div>
    );
  }
  const copy = EMPTY_COPY[status];
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <Map className="size-7 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{copy.title}</p>
        <p className="max-w-sm text-xs text-muted-foreground">{copy.body}</p>
      </div>
      {status === "active" && canEdit && (
        <Button size="sm" onClick={onCreate}>
          <Plus />
          Add a mapping
        </Button>
      )}
    </div>
  );
}

function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <p className="text-sm text-muted-foreground">Could not load mappings.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
