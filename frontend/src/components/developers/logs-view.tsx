"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/dashboard/page-container";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { RequestLogsSection } from "./request-logs-section";

/**
 * the full log viewer. filters and paging live here rather than on the API
 * access overview, which now shows a fixed recent slice - that is what removed
 * the height jump on the overview instead of freezing it behind a fixed frame.
 *
 * the stats strip is computed in sql over a 24h window, not derived from the
 * rows on screen: a page-local average would describe the current page rather
 * than the traffic, and would change every time you paged.
 */
export function LogsView({
  workspace,
  workspaceId,
}: {
  workspace: string;
  workspaceId: string | null;
}) {
  return (
    <PageContainer>
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/app/${workspace}/developers`} aria-label="Back to API access">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">Request logs</h1>
        </div>
        <p className="pl-9 text-sm text-muted-foreground">
          Every REST call this workspace made, including ones that never started a run.
        </p>
      </header>

      {workspaceId && <StatsStrip workspaceId={workspaceId} />}

      <section className="raised overflow-hidden rounded-lg border bg-card">
        <div className="px-4 py-3.5">
          {workspaceId ? (
            <RequestLogsSection workspaceId={workspaceId} />
          ) : (
            <Skeleton className="h-[585px] w-full" />
          )}
        </div>
      </section>
    </PageContainer>
  );
}

function StatsStrip({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const stats = useQuery(trpc.developers.requestLogs.stats.queryOptions({ workspaceId }));

  if (stats.isPending) return <Skeleton className="h-[92px] w-full rounded-lg" />;
  // this used to `return null`, which deleted the whole strip on a failed
  // fetch - the page then looked like it was designed without these numbers
  // rather than like something had broken.
  if (stats.isError || !stats.data) {
    return (
      <section className="raised overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
          <TriangleAlert className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Could not load request stats.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => stats.refetch()}
            disabled={stats.isFetching}
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const { total, errors, p95Ms, topPaths, windowHours } = stats.data;
  const errorRate = total > 0 ? (errors / total) * 100 : 0;
  // "264h" is not a window a person reads. past a couple of days, say days.
  const windowLabel =
    windowHours <= 48 ? `${windowHours}h` : `${Math.round(windowHours / 24)}d`;

  return (
    <section className="raised overflow-hidden rounded-lg border bg-card">
      <div className="grid grid-cols-2 divide-y border-b sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <Stat label={`Requests (${windowLabel})`} value={total.toLocaleString()} />
        <Stat
          label="Errors"
          value={errors.toLocaleString()}
          // only tinted when there ARE errors. a red zero is a false alarm.
          tone={errors > 0 ? "danger" : undefined}
        />
        <Stat
          label="Error rate"
          value={`${errorRate.toFixed(1)}%`}
          tone={errorRate >= 5 ? "danger" : undefined}
        />
        <Stat label="p95 latency" value={`${p95Ms}ms`} />
      </div>

      {topPaths.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-[11px] font-medium text-muted-foreground">Busiest endpoints</p>
          <ul className="mt-2 space-y-1.5">
            {topPaths.map((p) => (
              <li key={p.path} className="flex items-center gap-3 text-xs">
                <span className="min-w-0 flex-1 truncate font-mono">{p.path}</span>
                {p.errors > 0 && (
                  <span className="shrink-0 font-mono tabular-nums text-destructive">
                    {p.errors} err
                  </span>
                )}
                <span className="w-24 shrink-0">
                  {/* a bar, not just a number: relative volume is the thing being
                      compared, and five numbers in a column do not show it. */}
                  <span className="block h-1 rounded-full bg-muted">
                    <span
                      className="block h-1 rounded-full bg-foreground/40"
                      style={{
                        width: `${Math.max(4, (p.count / (topPaths[0]?.count || 1)) * 100)}%`,
                      }}
                    />
                  </span>
                </span>
                <span className="w-10 shrink-0 text-right font-mono tabular-nums text-muted-foreground">
                  {p.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-mono text-lg leading-none tabular-nums ${
          tone === "danger" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
