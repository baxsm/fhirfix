"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { timeAgo } from "@/components/developers/shared";
import { Button } from "@/components/ui/button";
import { FilterPill } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { useTRPC } from "@/trpc/client";
import { DRIFT_LABELS, type DriftAlertRow, severityTone } from "./types";

export function AlertFeed({
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
  const [openOnly, setOpenOnly] = useState(true);

  const query = useQuery({
    ...trpc.monitoring.listAlerts.queryOptions({ workspaceId, unacknowledgedOnly: openOnly }),
    enabled: !!workspaceId,
  });

  const acknowledge = useMutation(
    trpc.monitoring.acknowledgeAlert.mutationOptions({
      onSuccess: () => {
        query.refetch();
        onChanged();
      },
      onError: (e) => toast.error(e.message ?? "Could not acknowledge the alert."),
    }),
  );

  const rows = (query.data ?? []) as DriftAlertRow[];

  return (
    <>
      <div className="flex items-center justify-end">
        <FilterPill active={openOnly} tone="danger" onClick={() => setOpenOnly((v) => !v)}>
          Unacknowledged only
        </FilterPill>
      </div>

      <div className="raised overflow-hidden rounded-md border bg-card">
        {query.isError ? (
          <FeedError onRetry={() => query.refetch()} />
        ) : query.isPending ? (
          <div className="p-4">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <FeedEmpty openOnly={openOnly} />
        ) : (
          <ul>
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-3 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusDot tone={severityTone(row.severity)}>
                      {DRIFT_LABELS[row.type]}
                    </StatusDot>
                    <span className="text-xs text-muted-foreground">{row.checkName}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{row.detail}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted-foreground">
                    {row.metricBefore && row.metricAfter && (
                      <span className="font-mono">
                        {row.metricBefore} to {row.metricAfter}
                      </span>
                    )}
                    <span title={new Date(row.createdAt).toLocaleString()}>
                      {timeAgo(row.createdAt)}
                    </span>
                    {row.runId && (
                      <Link
                        href={`/app/${workspace}/runs/${row.runId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        View report
                      </Link>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {row.acknowledgedAt ? (
                    <span className="text-xs text-muted-foreground">
                      Acknowledged {timeAgo(row.acknowledgedAt)}
                    </span>
                  ) : (
                    canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={acknowledge.isPending}
                        onClick={() => acknowledge.mutate({ workspaceId, id: row.id })}
                      >
                        Acknowledge
                      </Button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function FeedEmpty({ openOnly }: { openOnly: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <ShieldCheck className="size-7 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {openOnly ? "Nothing needs attention" : "No drift alerts yet"}
        </p>
        <p className="max-w-sm text-xs text-muted-foreground">
          {openOnly
            ? "Every alert has been acknowledged. Turn off the filter to see the history."
            : "Alerts appear here when a scheduled check scores below its baseline or finds a new kind of error."}
        </p>
      </div>
    </div>
  );
}

function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center">
      <p className="text-sm text-muted-foreground">Could not load drift alerts.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
