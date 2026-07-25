"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, FileScan, Map } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/ui/status";
import { useListOrganizations } from "@/lib/auth-client";
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

/**
 * the overview is a TRIAGE screen, not a stat wall.
 *
 * it used to be hardcoded to the phase-1 first-run state, so a workspace with
 * 15 runs and a live balance still read "Run your first check". it now answers
 * the two questions someone opening the app actually has: did the last thing I
 * ran work, and is anything waiting on me.
 */
export function OverviewView({ workspace }: { workspace: string }) {
  const base = `/app/${workspace}`;
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

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

  const loading = !enabled || runsQuery.isPending;
  const failedRuns = runs.filter((r) => r.status === "failed");
  const inFlight = runs.filter((r) => r.status === "running" || r.status === "queued");
  const latest = runs[0];

  // a genuinely new workspace still gets the guided state - it is the right
  // screen when there is nothing to triage yet.
  if (!loading && runs.length === 0) {
    return <FirstRun base={base} />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading workspace activity."
              : summaryLine({
                  runs: runs.length,
                  failed: failedRuns.length,
                  inFlight: inFlight.length,
                })}
          </p>
        </div>
        {/* no New check here: the topbar carries it on every screen. */}
      </div>

      {loading ? (
        <OverviewSkeleton />
      ) : (
        <>
          {/* anything needing a decision comes first and only exists when it is
              real. an always-present "0 items need attention" panel is noise. */}
          {(failedRuns.length > 0 || pendingMappings > 0) && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                Needs attention
              </h2>
              <div className="raised enter-stagger divide-y overflow-hidden rounded-lg border bg-card">
                {failedRuns.length > 0 && (
                  <AttentionRow
                    href={`${base}/runs`}
                    tone="danger"
                    icon={AlertTriangle}
                    title={`${failedRuns.length} ${failedRuns.length === 1 ? "run" : "runs"} failed`}
                    body="The engine could not finish these. Open the run to see why."
                  />
                )}
                {pendingMappings > 0 && (
                  <AttentionRow
                    href={`${base}/mappings`}
                    tone="warning"
                    icon={Map}
                    title={`${pendingMappings} mapping ${pendingMappings === 1 ? "suggestion" : "suggestions"} to review`}
                    body="Approving a suggestion lets future runs auto-fix it."
                  />
                )}
              </div>
            </section>
          )}

          {/* the trend is STACKED above the list, not beside it.
              side-by-side made the chart's height a function of how many runs
              happen to exist: two runs squashed it, twenty stretched it. a
              chart's height is its own decision, so it gets a full-width band
              that is always the same size no matter what the list does. */}
          <ScoreTrend points={trend} latest={latest} />

          <section className="raised flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card">
            <div className="flex shrink-0 items-baseline justify-between gap-3 border-b px-4 py-2.5">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                Recent runs
              </h2>
              {/* a real button, not bare text. it was previously indistinguishable
                  from a caption. */}
              <Link
                href={`${base}/runs`}
                className="press -my-1 flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:border-ring hover:text-foreground"
              >
                View all
                <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="enter-stagger divide-y">
              {runs.slice(0, 6).map((r) => (
                <RecentRun key={r.id} row={r} href={`${base}/runs/${r.id}`} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
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
  icon: Icon,
}: {
  href: string;
  title: string;
  body: string;
  tone: "danger" | "warning";
  icon: typeof Map;
}) {
  return (
    <Link href={href} className="row-interactive group flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md border bg-background",
          tone === "danger" ? "text-destructive" : "text-warning",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{body}</p>
      </div>
      <ArrowRight className="row-reveal row-nudge size-4 shrink-0 text-foreground" />
    </Link>
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
        row.status === "failed" && "bg-destructive/[0.03]",
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
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

function FirstRun({ base }: { base: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
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
        <div className="raised enter-stagger divide-y overflow-hidden rounded-lg border bg-card">
          <AttentionRow
            href={`${base}/mappings`}
            tone="warning"
            icon={Map}
            title="Import your mapping registry"
            body="Bring assigning-authority and code mappings so fixes apply automatically."
          />
        </div>
      </section>
    </div>
  );
}
