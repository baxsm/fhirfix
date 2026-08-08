"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, FileScan, Map } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageContainer } from "@/components/dashboard/page-container";
import { RefreshingNote } from "@/components/dashboard/refreshing-note";
import { describeFailure } from "@/components/report/run-failure";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { useListOrganizations } from "@/lib/auth-client";
import { useDelayedFlag } from "@/lib/use-delayed-flag";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { isRealFailure } from "./runs/run-status";
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
  errorMessage: string | null;
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
  // a run the user cancelled is not an alarm, so it never raises the notice
  const failedRuns = runs.filter(isRealFailure);
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
            <section className="space-y-3">
              {failedRuns.length > 0 && failedRuns[0] && (
                <FailureNotice runs={failedRuns} base={base} />
              )}
              {pendingMappings > 0 && (
                <p className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
                  <Map className="size-3.5 shrink-0" />
                  <span>
                    {pendingMappings} mapping{" "}
                    {pendingMappings === 1 ? "suggestion needs" : "suggestions need"} review.
                    Approving one lets future runs auto-fix it.
                  </span>
                  <Link
                    href={`${base}/mappings`}
                    className="shrink-0 rounded-sm font-medium text-foreground underline underline-offset-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Review
                  </Link>
                </p>
              )}
            </section>
          )}

          {/* the trend is STACKED above the list, not beside it */}
          <ScoreTrend points={trend} latest={latest} pending={trendQuery.isPending} />

          <section className="raised flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
            <div className="flex shrink-0 items-baseline justify-between gap-3 border-b px-4 py-2.5">
              <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
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

// the only tinted surface on the page; a suggestion beside it stays plain text
function FailureNotice({ runs, base }: { runs: RunRow[]; base: string }) {
  const first = runs[0];
  if (!first) return null;
  const failure = describeFailure(first.errorMessage);
  const many = runs.length > 1;

  return (
    <div className="rounded-lg border border-destructive/25 bg-destructive-subtle px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-medium leading-tight text-destructive">
            {many ? `${runs.length} runs failed` : failure.title}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground/80">
            {many ? `Most recent: ${failure.title}. ${failure.cause}` : failure.cause}
          </p>
          {failure.next && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{failure.next}</p>
          )}
        </div>
        <Button variant="outline" size="xs" asChild className="shrink-0">
          <Link href={many ? `${base}/runs?status=failed` : `${base}/runs/${first.id}`}>
            {many ? "See all" : "Open run"}
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
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
    <div className="flex items-center gap-3 rounded-lg border bg-card py-2.5 pr-3 pl-3">
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md",
          tone === "danger"
            ? "bg-destructive-subtle text-destructive"
            : "bg-warning-subtle text-warning",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.8125rem] font-medium leading-tight">{title}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{body}</p>
      </div>
      <Button variant="outline" size="xs" asChild className="shrink-0">
        <Link href={href}>
          {action}
          <ArrowRight className="size-3" />
        </Link>
      </Button>
    </div>
  );
}

function relativeTime(value: string | Date) {
  const then = new Date(value);
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function runSummary({ status, findingsTotal, findingsAutoFixable }: RunRow) {
  if (status === "failed") return "The engine could not finish this run";
  if (status === "queued") return "Waiting to start";
  if (status === "running") return "Checking now";
  if (findingsTotal === 0) return "Clean, no findings";
  const findings = `${findingsTotal} finding${findingsTotal === 1 ? "" : "s"}`;
  if (findingsAutoFixable > 0) return `${findings}, ${findingsAutoFixable} auto-fixed`;
  return findings;
}

function RecentRun({ row, href }: { row: RunRow; href: string }) {
  const improved =
    row.conformanceScoreBefore != null &&
    row.conformanceScoreAfter != null &&
    row.conformanceScoreAfter > row.conformanceScoreBefore;
  return (
    <Link href={href} className="row-interactive group flex items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2 leading-tight">
          <span className="text-[0.8125rem] font-medium">{relativeTime(row.createdAt)}</span>
          <span className="font-mono text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
            {row.inputType.replace(/_/g, " ")}
          </span>
        </p>
        <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">
          {runSummary(row)}
        </p>
      </div>
      {row.status === "failed" ? (
        <StatusDot tone="danger">failed</StatusDot>
      ) : row.status === "running" || row.status === "queued" ? (
        <StatusDot tone="pending">{row.status}</StatusDot>
      ) : row.conformanceScoreBefore != null && row.conformanceScoreAfter != null ? (
        <span className="flex shrink-0 items-baseline gap-1.5 font-mono text-xs tabular-nums whitespace-nowrap">
          <span className="text-muted-foreground">{row.conformanceScoreBefore}</span>
          <ArrowRight className="size-3 self-center text-muted-foreground/45" />
          <span
            className={cn(
              "text-[0.9375rem] font-medium",
              improved ? "text-success" : "text-foreground",
            )}
          >
            {row.conformanceScoreAfter}
          </span>
          {improved ? (
            <span className="text-[0.6875rem] text-success">
              +{row.conformanceScoreAfter - row.conformanceScoreBefore}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">not scored</span>
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
            <p className="pt-1 font-mono text-[0.6875rem] text-muted-foreground/70">
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
        <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
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
