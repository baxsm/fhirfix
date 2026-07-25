"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, FileScan } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { StatusDot, type StatusTone } from "@/components/ui/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useListOrganizations } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type Status = "queued" | "running" | "completed" | "failed";

interface RunRow {
  id: string;
  status: Status;
  inputType: string;
  conformanceScoreBefore: number | null;
  conformanceScoreAfter: number | null;
  findingsTotal: number;
  findingsAutoFixable: number;
  createdAt: string | Date;
}

// completed is deliberately neutral. it is the expected outcome, so it gets no
// colour; that keeps the eye free for the failed row, which is the only one
// that needs an action.
const STATUS_TONE: Record<Status, StatusTone> = {
  completed: "neutral",
  running: "info",
  queued: "pending",
  failed: "danger",
};

const PAGE_SIZE = 15;

function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunsView({ workspace }: { workspace: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  const router = useRouter();
  const trpc = useTRPC();
  const [page, setPage] = useState(0);
  const [failedOnly, setFailedOnly] = useState(false);

  const query = useQuery({
    ...trpc.run.list.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const all = useMemo(() => (query.data ?? []) as RunRow[], [query.data]);
  const filtered = useMemo(
    () => (failedOnly ? all.filter((r) => r.status === "failed") : all),
    [all, failedOnly],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const runs = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const failedCount = all.filter((r) => r.status === "failed").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {/* no New check action here: the topbar already carries it on every
          screen, and two identical primary buttons on one page is noise. */}
      <PageHeader
        title="Runs"
        description="Every conformance check, with findings and before/after scores."
      />

      {query.isError ? (
        <ListError onRetry={() => query.refetch()} />
      ) : query.isLoading || !workspaceId ? (
        <SkeletonTable />
      ) : all.length === 0 ? (
        <EmptyRuns workspace={workspace} />
      ) : (
        <div className="space-y-3">
          {/* only offer the filter when there is something to filter to. a
              permanently-disabled control is noise. */}
          {failedCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={failedOnly}
                onClick={() => {
                  setFailedOnly((v) => !v);
                  setPage(0);
                }}
                className={cn(
                  "press cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium",
                  failedOnly
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Failed only
                <span className="ml-1.5 font-mono tabular-nums opacity-70">{failedCount}</span>
              </button>
            </div>
          )}

          <div className="raised overflow-hidden rounded-lg border bg-card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Run</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Findings</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-right">When</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => {
                    const href = `/app/${workspace}/runs/${r.id}`;
                    const go = () => router.push(href);
                    const improved =
                      r.conformanceScoreBefore != null &&
                      r.conformanceScoreAfter != null &&
                      r.conformanceScoreAfter > r.conformanceScoreBefore;
                    return (
                      <TableRow
                        key={r.id}
                        tabIndex={0}
                        role="button"
                        onClick={go}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            go();
                          }
                        }}
                        className={cn(
                          "row-interactive group cursor-pointer",
                          // a failed row is marked by its status text and a
                          // faint tint. no coloured bar down the left edge -
                          // the status column already says "failed" in red.
                          r.status === "failed" && "bg-destructive/[0.03]",
                        )}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs">{r.id}</span>
                            <span className="font-mono text-[10px] uppercase text-muted-foreground">
                              {r.inputType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusDot tone={STATUS_TONE[r.status]}>{r.status}</StatusDot>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {r.findingsTotal === 0 ? (
                            <span className="text-muted-foreground">0</span>
                          ) : (
                            <>
                              {r.findingsTotal}
                              {r.findingsAutoFixable > 0 && (
                                <span className="ml-1 text-muted-foreground">
                                  · {r.findingsAutoFixable} auto
                                </span>
                              )}
                            </>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {r.conformanceScoreBefore != null && r.conformanceScoreAfter != null ? (
                            <span className="whitespace-nowrap">
                              <span className="text-muted-foreground">
                                {r.conformanceScoreBefore}
                              </span>
                              <span className="mx-1 text-muted-foreground/50">→</span>
                              {/* emerald appears only when the score actually
                                  rose. a flat score is not a success. */}
                              <span className={improved ? "text-success" : "text-foreground"}>
                                {r.conformanceScoreAfter}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs whitespace-nowrap text-muted-foreground">
                          {fmtDate(r.createdAt)}
                        </TableCell>
                        <TableCell>
                          {/* the chevron is invisible until the row is hovered
                              or focused, but it always occupies its cell, so
                              revealing it never reflows the table. */}
                          <ArrowRight className="row-reveal row-nudge size-3.5 text-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* the backend caps this list at 50, so say so rather than implying
              the workspace only ever had this many runs. */}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {current * PAGE_SIZE + 1}-{current * PAGE_SIZE + runs.length} of {filtered.length}
              {all.length >= 50 && !failedOnly && " (most recent 50)"}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  Previous
                </Button>
                <span className="font-mono tabular-nums">
                  {current + 1}/{pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current >= pageCount - 1}
                  onClick={() => setPage(current + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="raised overflow-hidden rounded-lg border bg-card">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
          <div className="h-8 flex-1 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyRuns({ workspace }: { workspace: string }) {
  return (
    <div className="raised flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
        <Activity className="size-4 text-muted-foreground" />
      </span>
      <div className="space-y-1">
        <h2 className="text-sm font-medium">No runs yet</h2>
        <p className="mx-auto max-w-sm text-xs text-muted-foreground">
          Run your first conformance check to see findings, fixes, and before/after scores here.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href={`/app/${workspace}/check`}>
          <FileScan className="size-4" />
          Run a check
        </Link>
      </Button>
    </div>
  );
}

function ListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/[0.03] px-6 py-14 text-center">
      <h2 className="text-sm font-medium">Could not load runs</h2>
      <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
