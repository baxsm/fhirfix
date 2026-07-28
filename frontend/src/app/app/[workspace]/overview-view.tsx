"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, FileScan, Map } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageContainer } from "@/components/dashboard/page-container";
import { RefreshingNote } from "@/components/dashboard/refreshing-note";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { useListOrganizations } from "@/lib/auth-client";
import { useDelayedFlag } from "@/lib/use-delayed-flag";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { ScoreTrend } from "./score-trend";

interface RunRow {
  id: string;
  status: "queued" | "running" | "completed" | "failed";
  inputType: string;
  conformanceScoreBefore: number | null;
  conformanceScoreAfter: number | null;
  findingsTotal: number;
  findingsAutoFixable: number;
  createdAt: string | Date;
}

export function OverviewView({
  workspace,
  workspaceId: serverWorkspaceId,
}: {
  workspace: string;
  workspaceId?: string;
}) {
  const base = `/app/${workspace}`;
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

  const trpc = useTRPC();
  const enabled = !!workspaceId;

  const runsQuery = useQuery({ ...trpc.run.list.queryOptions({ workspaceId }), enabled });
  const trendQuery = useQuery({ ...trpc.run.trend.queryOptions({ workspaceId }), enabled });
  const mappingsQuery = useQuery({
    ...trpc.mappings.counts.queryOptions({ workspaceId }),
    enabled,
  });

  const runs = useMemo(() => (runsQuery.data ?? []) as RunRow[], [runsQuery.data]);
  const trend = trendQuery.data ?? [];
  const pendingMappings = mappingsQuery.data?.suggested ?? 0;

  const settling = !enabled || runsQuery.isPending;
  const loading = useDelayedFlag(settling);
  // data is on screen and being refreshed: annotate, never tear down.
  const refreshing = !settling && runsQuery.isFetching;
  const failedRuns = runs.filter((r) => r.status === "failed");
  const inFlight = runs.filter((r) => r.status === "running" || r.status === "queued");
  const latest = runs[0];

  if (!settling && runs.length === 0) {
    return <FirstRun base={base} />;
  }

  return (
    <PageContainer>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            {settling
              ? "Loading workspace activity."
              : summaryLine({
                  runs: runs.length,
                  failed: failedRuns.length,
                  inFlight: inFlight.length,
                })}
          </p>
        </div>
        <RefreshingNote active={refreshing} />
      </div>

      {loading ? (
        <OverviewSkeleton />
      ) : (
        <>
          {/* anything needing a decision comes first and only exists when it is real */}
          {(failedRuns.length > 0 || pendingMappings > 0) && (
            <section className="space-y-2">
              {failedRuns.length > 0 && (
                <AttentionRow
                  href={`${base}/runs`}
                  tone="danger"
                  icon={AlertTriangle}
                  title={`${failedRuns.length} ${failedRuns.length === 1 ? "run" : "runs"} failed`}
                  body="The engine could not finish these. Open the run to see why."
                  action="Review"
                />
              )}
              {pendingMappings > 0 && (
                <AttentionRow
                  href={`${base}/mappings`}
                  tone="warning"
                  icon={Map}
                  title={`${pendingMappings} mapping ${pendingMappings === 1 ? "suggestion" : "suggestions"} to review`}
                  body="Approving a suggestion lets future runs auto-fix it."
                  action="Review"
                />
              )}
            </section>
          )}

          {/* the trend is STACKED above the list, not beside it */}
          <ScoreTrend points={trend} latest={latest} pending={trendQuery.isPending} />

          <section className="raised flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
            <div className="flex shrink-0 items-baseline justify-between gap-3 border-b px-4 py-2.5">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                Recent runs
              </h2>
              {/* the Button component, not a hand-rolled div with border and padding classes */}
              <Button variant="outline" size="xs" asChild className="-my-1">
                <Link href={`${base}/runs`}>
                  View all
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
            <div className="enter-stagger divide-y">
              {runs.slice(0, 6).map((r) => (
                <RecentRun key={r.id} row={r} href={`${base}/runs/${r.id}`} />
              ))}
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
}

function summaryLine({
  runs,
  failed,
  inFlight,
}: {
  runs: number;
  failed: number;
  inFlight: number;
}) {
  if (inFlight > 0) return `${inFlight} check${inFlight === 1 ? "" : "s"} running now.`;
  if (failed > 0) {
    return `${failed} of your last ${runs} run${runs === 1 ? "" : "s"} failed and need a look.`;
  }
  return `${runs} check${runs === 1 ? "" : "s"} run in this workspace. Everything completed.`;
}

function AttentionRow({
  href,
  title,
  body,
  tone,
  action,
  icon: Icon,
}: {
  href: string;
  title: string;
  body: string;
  tone: "danger" | "warning";
  action: string;
  icon: typeof Map;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-l-2 py-2.5 pr-3 pl-3",
        tone === "danger"
          ? "border-destructive/25 border-l-destructive bg-destructive/[0.04]"
          : "border-warning/25 border-l-warning bg-warning/[0.05]",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", tone === "danger" ? "text-destructive" : "text-warning")}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{body}</p>
      </div>
      <Button variant="outline" size="xs" asChild className="shrink-0 bg-background">
        <Link href={href}>
          {action}
          <ArrowRight className="size-3" />
        </Link>
      </Button>
    </div>
  );
}

function RecentRun({ row, href }: { row: RunRow; href: string }) {
  const improved =
    row.conformanceScoreBefore != null &&
    row.conformanceScoreAfter != null &&
    row.conformanceScoreAfter > row.conformanceScoreBefore;
  return (
    <Link
      href={href}
      className={cn(
        "row-interactive group flex items-center gap-3 px-4 py-2.5",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs">{row.id}</p>
        <p className="font-mono text-[10px] uppercase text-muted-foreground">{row.inputType}</p>
      </div>
      {row.status === "failed" ? (
        <StatusDot tone="danger">failed</StatusDot>
      ) : (
        <span className="shrink-0 font-mono text-xs tabular-nums whitespace-nowrap">
          {row.conformanceScoreBefore != null && row.conformanceScoreAfter != null ? (
            <>
              <span className="text-muted-foreground">{row.conformanceScoreBefore}</span>
              <span className="mx-1 text-muted-foreground/50">→</span>
              <span className={improved ? "text-success" : "text-foreground"}>
                {row.conformanceScoreAfter}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      )}
    </Link>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-[168px] w-full rounded-lg" />
      <div className="raised overflow-hidden rounded-lg border bg-card">
        <div className="border-b px-4 py-2.5">
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="divide-y">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-52" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FirstRun({ base }: { base: string }) {
  return (
    <PageContainer width="reading">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Get started</h1>
        <p className="text-sm text-muted-foreground">
          Run a conformance check to see ranked, plain-language findings and auto-fixes.
        </p>
      </div>
      <div className="raised rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-sm font-semibold">Run your first check</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Paste FHIR or HL7v2 and the engine detects, explains, and fixes the conformance
              failures.
            </p>
            <p className="pt-1 font-mono text-[11px] text-muted-foreground/70">
              US Core 6.1.0 · FHIR R4 · Da Vinci PAS 2.0.1 / PDex 2.0.0
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href={`${base}/check`}>
              <FileScan className="size-4" />
              New check
            </Link>
          </Button>
        </div>
      </div>
      <section className="space-y-2">
        <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
          Set up your workspace
        </h3>
        <AttentionRow
          href={`${base}/mappings`}
          tone="warning"
          icon={Map}
          title="Import your mapping registry"
          body="Bring assigning-authority and code mappings so fixes apply automatically."
          action="Open"
        />
      </section>
    </PageContainer>
  );
}
