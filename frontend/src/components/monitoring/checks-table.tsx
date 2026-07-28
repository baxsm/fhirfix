"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Play, Plus, Radar } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { timeAgo } from "@/components/developers/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PendingRows } from "@/components/ui/pending-rows";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";
import { CheckDialog } from "./check-dialog";
import { type ScheduledCheckRow, TARGET_LABELS } from "./types";

export function ChecksTable({
  workspace,
  workspaceId,
  canManage,
  onChanged,
}: {
  workspace: string;
  workspaceId: string;
  canManage: boolean;
  onChanged: () => void;
}) {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.monitoring.listChecks.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduledCheckRow | null>(null);

  const refresh = () => {
    query.refetch();
    onChanged();
  };

  const toggle = useMutation(
    trpc.monitoring.setEnabled.mutationOptions({
      onSuccess: () => refresh(),
      onError: (e) => toast.error(e.message ?? "Could not change the schedule."),
    }),
  );
  const runNow = useMutation(
    trpc.monitoring.runNow.mutationOptions({
      onSuccess: () => {
        toast.success("Check queued. The report appears in runs when it finishes.");
        refresh();
      },
      onError: (e) => toast.error(e.message ?? "Could not run the check."),
    }),
  );
  const remove = useMutation(
    trpc.monitoring.deleteCheck.mutationOptions({
      onSuccess: () => {
        toast.success("Scheduled check deleted.");
        refresh();
      },
      onError: (e) => toast.error(e.message ?? "Could not delete the check."),
    }),
  );

  const busy = toggle.isPending || runNow.isPending || remove.isPending;
  const rows = (query.data ?? []) as ScheduledCheckRow[];

  return (
    <>
      {/* hidden while empty: the empty state carries the only call to action */}
      {canManage && rows.length > 0 && (
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            Schedule a check
          </Button>
        </div>
      )}

      <div className="raised overflow-hidden rounded-md border bg-card">
        {query.isError ? (
          <ListError onRetry={() => query.refetch()} />
        ) : !query.isPending && rows.length === 0 ? (
          <ChecksEmpty canManage={canManage} onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="overflow-x-auto">
            {/* the header is static, so it stays mounted while rows load */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Check</th>
                  <th className="px-4 py-2 font-medium">Schedule</th>
                  <th className="px-4 py-2 font-medium">Target</th>
                  <th className="px-4 py-2 font-medium">Last run</th>
                  <th className="px-4 py-2 font-medium">Active</th>
                  <th className="w-8 px-4 py-2" />
                </tr>
              </thead>
              {query.isPending ? (
                <PendingRows columns={6} />
              ) : (
                <tbody className="enter-stagger">
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.name}</p>
                        {row.baselineConfig?.minPassRate != null && (
                          <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                            Alerts below {row.baselineConfig.minPassRate}%
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.scheduleLabel}</td>
                      <td className="max-w-[280px] px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                          {TARGET_LABELS[row.targetType]}
                        </p>
                        <code className="block truncate font-mono text-xs" title={row.targetRef}>
                          {row.targetRef}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <LastRun row={row} workspace={workspace} />
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={row.enabled}
                          disabled={!canManage || busy}
                          aria-label={`Run ${row.name} on schedule`}
                          onCheckedChange={(enabled) =>
                            toggle.mutate({ workspaceId, id: row.id, enabled })
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={busy}
                              aria-label={`Run ${row.name} now`}
                              onClick={() => runNow.mutate({ workspaceId, id: row.id })}
                            >
                              <Play />
                              Run now
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  disabled={busy}
                                  aria-label={`Actions for ${row.name}`}
                                >
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => setEditTarget(row)}>
                                  Edit check
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => remove.mutate({ workspaceId, id: row.id })}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}
      </div>

      <CheckDialog
        workspaceId={workspaceId}
        open={createOpen}
        target={null}
        onOpenChange={setCreateOpen}
        onSaved={refresh}
      />
      <CheckDialog
        workspaceId={workspaceId}
        open={editTarget !== null}
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSaved={refresh}
      />
    </>
  );
}

function LastRun({ row, workspace }: { row: ScheduledCheckRow; workspace: string }) {
  if (row.lastError) {
    return (
      <div className="min-w-0">
        <StatusDot tone="danger">Failed</StatusDot>
        <p
          className="mt-0.5 max-w-[220px] truncate text-[0.6875rem] text-muted-foreground"
          title={row.lastError}
        >
          {row.lastError}
        </p>
      </div>
    );
  }
  if (!row.lastRunAt) {
    return <span className="text-xs text-muted-foreground">Not run yet</span>;
  }
  return (
    <div className="min-w-0">
      <span
        className="text-xs text-muted-foreground"
        title={new Date(row.lastRunAt).toLocaleString()}
      >
        {timeAgo(row.lastRunAt)}
      </span>
      {row.lastRunId && (
        <Link
          href={`/app/${workspace}/runs/${row.lastRunId}`}
          className="mt-0.5 block text-[0.6875rem] underline-offset-2 hover:underline"
        >
          View report
        </Link>
      )}
    </div>
  );
}

function ChecksEmpty({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <Radar className="size-7 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">No scheduled checks yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Validate an endpoint on a schedule and get alerted when conformance drops.
        </p>
      </div>
      {canManage && (
        <Button size="sm" onClick={onCreate}>
          Schedule a check
        </Button>
      )}
    </div>
  );
}

function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <p className="text-sm text-muted-foreground">Could not load scheduled checks.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
