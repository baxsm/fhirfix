"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Braces, FileScan, Filter } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { RefreshingNote } from "@/components/dashboard/refreshing-note";
import { Button } from "@/components/ui/button";
import { LoadError } from "@/components/ui/load-error";
import { FilterPill } from "@/components/ui/segmented";
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
import { useDelayedFlag } from "@/lib/use-delayed-flag";
import { useTRPC } from "@/trpc/client";
import { isCancelled, isRealFailure, type Status } from "./run-status";

interface RunRow {
  id: string;
  status: Status;
  inputType: string;
  conformanceScoreBefore: number | null;
  conformanceScoreAfter: number | null;
  findingsTotal: number;
  findingsAutoFixable: number;
  createdAt: string | Date;
  errorMessage: string | null;
}

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

export function RunsView({
  workspace,
  workspaceId: serverWorkspaceId,
  initialFailedOnly = false,
}: {
  workspace: string;
  workspaceId?: string;
  initialFailedOnly?: boolean;
}) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

  const router = useRouter();
  const trpc = useTRPC();
  const [page, setPage] = useState(0);
  const [failedOnly, setFailedOnly] = useState(initialFailedOnly);

  const query = useQuery({
    ...trpc.run.list.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  // the filter lives in the url so a deep link or refresh keeps the same view
  const showFailedOnly = (next: boolean) => {
    setFailedOnly(next);
    setPage(0);
    const url = next ? `/app/${workspace}/runs?status=failed` : `/app/${workspace}/runs`;
    window.history.replaceState({}, "", url);
  };

  const all = useMemo(() => (query.data ?? []) as RunRow[], [query.data]);
  const filtered = useMemo(() => (failedOnly ? all.filter(isRealFailure) : all), [all, failedOnly]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const runs = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const failedCount = all.filter(isRealFailure).length;

  const settling = query.isPending || !workspaceId;
  const loading = useDelayedFlag(settling);
  const refreshing = !settling && query.isFetching;

  return (
    <PageContainer width="full">
      {/* no New check action here: the topbar already carries it on every screen, and two identical */}
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Runs"
          description="Every conformance check, with findings and before/after scores."
        />
        <RefreshingNote active={refreshing} />
      </div>

      {query.isError ? (
        <LoadError what="runs" onRetry={() => query.refetch()} />
      ) : loading ? (
        <SkeletonTable />
      ) : settling ? null : all.length === 0 ? (
        <EmptyRuns workspace={workspace} />
      ) : (
        <div className="space-y-3">
          {/* only offer the filter when there is something to filter to */}
          {failedCount > 0 && (
            <div className="flex items-center gap-2">
              {/* the icon is what says "this narrows the list" at rest */}
              <FilterPill
                active={failedOnly}
                tone="danger"
                count={failedCount}
                icon={Filter}
                onClick={() => showFailedOnly(!failedOnly)}
              >
                Failed only
              </FilterPill>
              {failedOnly && (
                <span className="text-xs text-muted-foreground">
                  Showing failed runs only.{" "}
                  <button
                    type="button"
                    onClick={() => showFailedOnly(false)}
                    className="cursor-pointer rounded-sm underline underline-offset-2 hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Show all
                  </button>
                </span>
              )}
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
                  {/* a ?status=failed link can outlive the failure, so say nothing is failing */}
                  {runs.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="py-10 text-center">
                        <p className="text-sm">No failed runs.</p>
                        <button
                          type="button"
                          onClick={() => showFailedOnly(false)}
                          className="mt-1 cursor-pointer rounded-sm text-xs text-muted-foreground underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          Show all runs
                        </button>
                      </TableCell>
                    </TableRow>
                  )}
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
                        className="row-interactive group cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                              {r.inputType.toLowerCase().includes("json") ? (
                                <Braces className="size-3.5" />
                              ) : (
                                <FileScan className="size-3.5" />
                              )}
                            </span>
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="text-[13px] font-medium">
                                {r.inputType.replace(/_/g, " ").toUpperCase()}
                              </span>
                              <span className="font-mono text-[0.6875rem] text-muted-foreground/60">
                                {r.id.slice(-8)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isCancelled(r) ? (
                            <StatusDot tone="neutral">cancelled</StatusDot>
                          ) : (
                            <StatusDot tone={STATUS_TONE[r.status]}>{r.status}</StatusDot>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">
                          {r.findingsTotal === 0 ? (
                            <span className="text-muted-foreground">0</span>
                          ) : (
                            <>
                              {r.findingsTotal}
                              {r.findingsAutoFixable > 0 && (
                                <span className="ml-1 text-muted-foreground">
                                  ({r.findingsAutoFixable} auto-fixed)
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
                              {/* emerald appears only when the score actually rose */}
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
                          {/* the chevron is invisible until the row is hovered or focused, but it always occupies its */}
                          <ArrowRight className="row-reveal row-nudge size-3.5 text-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* the backend caps this list at 50, so say so rather than implying the workspace only ever */}
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">
              {runs.length > 0 && (
                <>
                  {current * PAGE_SIZE + 1}-{current * PAGE_SIZE + runs.length} of {filtered.length}
                  {all.length >= 50 && !failedOnly && " (most recent 50)"}
                </>
              )}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-disabled={current === 0}
                  onClick={() => current > 0 && setPage(current - 1)}
                >
                  Previous
                </Button>
                <span className="font-mono tabular-nums">
                  {current + 1}/{pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  aria-disabled={current >= pageCount - 1}
                  onClick={() => current < pageCount - 1 && setPage(current + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
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
