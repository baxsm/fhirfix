"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  Download,
  FileWarning,
  Loader2,
  Sparkles,
  TriangleAlert,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { useTRPC, useTRPCClient } from "@/trpc/client";
import { DiffView } from "./diff-view";
import {
  applyPreset,
  EMPTY_FACETS,
  FacetSidebar,
  type Facets,
  filterFindings,
  type Preset,
} from "./facet-sidebar";
import { FindingDetail } from "./finding-detail";
import type { FindingRow, Severity } from "./report-types";
import { describeFailure } from "./run-failure";

const SEVERITY_LABEL: Record<Severity, string> = {
  error: "Errors",
  warning: "Warnings",
  info: "Info",
};

function ScoreDelta({ before, after }: { before: number | null; after: number | null }) {
  const gain = before != null && after != null ? after - before : null;
  const improved = gain != null && gain > 0;
  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap">
      <span className="font-mono text-lg tabular-nums text-muted-foreground">{before ?? "—"}</span>
      <ArrowRight className="size-3.5 shrink-0 self-center text-muted-foreground/40" />
      <span
        className={cn(
          "font-mono text-lg tabular-nums",
          improved ? "text-success" : "text-foreground",
        )}
      >
        {after ?? "—"}
      </span>
      {improved && <span className="font-mono text-[11px] tabular-nums text-success">+{gain}</span>}
    </div>
  );
}

// clickable severity chip that filters the list.
function SeverityChip({
  severity,
  count,
  active,
  onClick,
}: {
  severity: Severity;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const dot =
    severity === "error" ? "bg-destructive" : severity === "warning" ? "bg-warning" : "bg-info";
  const none = count === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={none}
      className={cn(
        "press flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px]",
        none && "cursor-default opacity-45",
        !none && "cursor-pointer",
        active ? "border-foreground/30 bg-accent" : !none && "hover:bg-accent",
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dot, none && "opacity-40")} />
      <span>{SEVERITY_LABEL[severity]}</span>
      <span className="font-mono tabular-nums text-muted-foreground">{count}</span>
    </button>
  );
}

interface RunData {
  run: {
    id: string;
    status: "queued" | "running" | "completed" | "failed";
    conformanceScoreBefore: number | null;
    conformanceScoreAfter: number | null;
    findingsTotal: number;
    findingsAutoFixable: number;
    resourceCount: number;
    inputType: string;
    errorMessage: string | null;
    autoFixApplied: boolean;
    createdAt: string | Date;
    completedAt: string | Date | null;
  };
  findings: FindingRow[];
  corrected: string | null;
  input: string | null;
}

export function ReportView({
  workspaceId,
  runId,
  workspace,
  runMissing,
}: {
  workspaceId: string;
  runId: string;
  // the slug, for links out of here. the id above is not routable.
  workspace?: string;
  // the server already resolved this run and found nothing.
  runMissing?: boolean;
}) {
  const trpc = useTRPC();
  const client = useTRPCClient();

  const query = useQuery({
    ...trpc.run.get.queryOptions({ workspaceId, runId }),
    enabled: !!workspaceId,
    refetchInterval: (q) => {
      const status = q.state.data?.run.status;
      return status === "queued" || status === "running" ? 1000 : false;
    },
    refetchIntervalInBackground: true,
  });

  const data = query.data as RunData | undefined;
  const run = data?.run;
  const findings = useMemo(() => (data?.findings ?? []) as FindingRow[], [data?.findings]);

  const [preset, setPreset] = useState<Preset>("all");
  const [facets, setFacets] = useState<Facets>({ ...EMPTY_FACETS });
  const [busyFp, setBusyFp] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);

  const setPresetAndFacets = (p: Preset) => {
    setPreset(p);
    setFacets(applyPreset(p));
  };

  const invalidate = () => query.refetch();

  const applyFix = useMutation(
    trpc.run.applyFix.mutationOptions({
      onSuccess: () => invalidate(),
      onError: (e) => {
        toast.error(e.message ?? "Could not apply the fix.");
        setBusyFp(null);
        setApplyingAll(false);
      },
    }),
  );
  const fixWithAi = useMutation(
    trpc.run.fixWithAi.mutationOptions({
      onSuccess: () => {
        toast.info("Asking the assistant for a fix...");
        invalidate();
      },
      onError: (e) => {
        toast.error(e.message ?? "AI fix is unavailable.");
        setBusyFp(null);
      },
    }),
  );
  const dismiss = useMutation(
    trpc.run.dismissFinding.mutationOptions({
      onSuccess: () => {
        toast.success("Finding dismissed.");
        invalidate();
      },
      onError: (e) => toast.error(e.message ?? "Could not dismiss."),
    }),
  );
  const cancel = useMutation(
    trpc.run.cancel.mutationOptions({
      onSuccess: () => invalidate(),
      onError: (e) => toast.error(e.message ?? "Could not cancel."),
    }),
  );

  // when the run flips back to running (an apply is in flight), keep polling.
  const isBusy = run?.status === "queued" || run?.status === "running";
  useEffect(() => {
    if (run?.status === "completed") {
      setBusyFp(null);
      setApplyingAll(false);
    }
  }, [run?.status]);

  if (query.isError) {
    return (
      <TerminalState
        icon={XCircle}
        tone="error"
        title="Could not load this report"
        body="The report could not be loaded. Check your connection and try again."
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (runMissing || (!run && !query.isPending && !query.isFetching)) {
    return (
      <TerminalState
        icon={XCircle}
        tone="error"
        title="Run not found"
        body="This run does not exist, or it belongs to a different workspace."
        action={
          <Button asChild variant="outline">
            <Link href={workspace ? `/app/${workspace}/runs` : "/app"}>Back to all runs</Link>
          </Button>
        }
      />
    );
  }

  if (!run) {
    return <ReportSkeleton />;
  }

  if (run.status === "queued" || run.status === "running") {
    return (
      <InProgress
        runId={runId}
        status={run.status}
        onCancel={() => cancel.mutate({ workspaceId, runId })}
        cancelling={cancel.isPending}
      />
    );
  }

  if (run.status === "failed") {
    return <FailedRun run={run} workspace={workspace} />;
  }

  // completed.
  const active = findings.filter((f) => f.fixStatus !== "dismissed");
  const counts: Record<Severity, number> = {
    error: active.filter((f) => f.severity === "error").length,
    warning: active.filter((f) => f.severity === "warning").length,
    info: active.filter((f) => f.severity === "info").length,
  };
  const applied = findings.filter((f) => f.fixStatus === "applied").length;
  const fixableNow = active.filter((f) => f.fixStatus === "suggested");
  const openErrors = counts.error;

  const shown = filterFindings(findings, facets, preset);

  const applyAllSafe = () => {
    const fps = [...new Set(fixableNow.map((f) => f.dedupFingerprint))];
    if (fps.length === 0) return;
    setApplyingAll(true);
    applyFix.mutate({ workspaceId, runId, fingerprints: fps });
  };

  const onApply = (f: FindingRow) => {
    setBusyFp(f.dedupFingerprint);
    applyFix.mutate({ workspaceId, runId, fingerprints: [f.dedupFingerprint] });
  };
  const onAi = (f: FindingRow) => {
    setBusyFp(f.dedupFingerprint);
    fixWithAi.mutate({ workspaceId, runId, fingerprint: f.dedupFingerprint });
  };
  const onDismiss = (f: FindingRow) => dismiss.mutate({ workspaceId, runId, findingId: f.id });

  const toggleChip = (s: Severity) => {
    const next = new Set(facets.severities);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setFacets({ ...facets, severities: next });
    setPreset("all");
  };

  const allClear = openErrors === 0 && active.length === 0;
  const base = `${env.NEXT_PUBLIC_API_URL}/api/runs/${runId}`;

  return (
    <div className="space-y-6">
      {/* header bar */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {/* the run id is already the breadcrumb's last crumb, so it is a quiet label here rather than */}
              <h1 className="truncate font-mono text-sm">{run.id}</h1>
              <span className="shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                {run.inputType}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {run.resourceCount} {run.resourceCount === 1 ? "resource" : "resources"} scanned ·{" "}
              {findings.length} {findings.length === 1 ? "finding" : "findings"}
              {applied > 0 && <span className="text-success"> · {applied} auto-fixed</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={`${base}/download`}>Corrected FHIR</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`${base}/export/json`}>JSON report</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`${base}/export/operation-outcome`}>OperationOutcome</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`${base}/export/pdf`}>PDF summary</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* filters and score share one rule-separated band instead of the score floating in its own */}
        <div className="flex flex-wrap items-center gap-2 border-y py-2.5">
          {(["error", "warning", "info"] as Severity[]).map((s) => (
            <SeverityChip
              key={s}
              severity={s}
              count={counts[s]}
              active={facets.severities.has(s)}
              onClick={() => toggleChip(s)}
            />
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              Score
            </span>
            <ScoreDelta before={run.conformanceScoreBefore} after={run.conformanceScoreAfter} />
          </div>
        </div>

        {/* the highest-leverage line: turns a scary total into one action. */}
        {fixableNow.length > 0 ? (
          <div className="raised flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-2.5 py-2">
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="size-4 shrink-0 text-success" />
              <span>
                <span className="font-medium">{fixableNow.length}</span> of {active.length} findings
                are safely auto-fixable.
              </span>
            </div>
            <Button
              variant="success"
              size="sm"
              disabled={applyingAll || isBusy}
              onClick={applyAllSafe}
            >
              {applyingAll || isBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Apply all safe fixes
            </Button>
          </div>
        ) : run.conformanceScoreAfter != null &&
          run.conformanceScoreBefore != null &&
          run.conformanceScoreAfter >= run.conformanceScoreBefore &&
          openErrors === 0 ? (
          <div className="raised flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm">
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            Re-verified clean. No conformance errors remain.
          </div>
        ) : null}
      </header>

      {/* body: index · findings. TWO columns, not three */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <FacetSidebar
          findings={findings}
          facets={facets}
          preset={preset}
          onPreset={setPresetAndFacets}
          onFacets={setFacets}
        />

        {allClear ? (
          <div className="min-w-0 flex-1">
            <AllClear resourceCount={run.resourceCount} />
          </div>
        ) : shown.length === 0 ? (
          <div className="min-w-0 flex-1">
            <FilteredZero onClear={() => setPresetAndFacets("all")} />
          </div>
        ) : (
          <>
            {/* the findings themselves, stacked at the full remaining width */}
            <div className="enter-stagger min-w-0 flex-1 space-y-3">
              {shown.map((f) => (
                <div
                  key={f.id}
                  id={`finding-${f.id}`}
                  className="raised overflow-hidden rounded-lg border bg-card"
                >
                  <FindingDetail
                    finding={f}
                    before={data?.input ?? null}
                    after={data?.corrected ?? null}
                    busy={
                      busyFp === f.dedupFingerprint || (applyingAll && f.fixStatus === "suggested")
                    }
                    onApply={onApply}
                    onFixWithAi={onAi}
                    onDismiss={onDismiss}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FailedRun({ run, workspace }: { run: RunData["run"]; workspace?: string }) {
  const [showRaw, setShowRaw] = useState(false);
  const failure = describeFailure(run.errorMessage);
  const cancelled = failure.kind === "cancelled";

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-mono text-sm">{run.id}</h1>
            <span className="shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {run.inputType}
            </span>
          </div>
          {/* deliberately NOT "0 resources scanned" */}
          <p className="mt-1 text-sm text-muted-foreground">
            Started {fmtRunTime(run.createdAt)}
            {run.completedAt
              ? ` · ${cancelled ? "cancelled" : "failed"} ${fmtRunTime(run.completedAt)}`
              : null}
          </p>
        </div>
        <div className="border-y py-2.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs",
              cancelled ? "text-muted-foreground" : "text-destructive",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                cancelled ? "bg-muted-foreground/50" : "bg-destructive",
              )}
            />
            {cancelled ? "Cancelled" : "Failed"}
          </span>
        </div>
      </header>

      <div
        className={cn(
          "raised rounded-lg border px-4 py-4",
          cancelled ? "bg-card" : "border-destructive/25 bg-destructive/[0.04]",
        )}
      >
        <div className="flex gap-3">
          {cancelled ? (
            <CircleSlash className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <FileWarning className="mt-0.5 size-4 shrink-0 text-destructive" />
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium leading-tight">{failure.title}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{failure.cause}</p>
            {failure.next && (
              <p className="text-sm leading-relaxed text-muted-foreground">{failure.next}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 pl-7">
          {workspace && (
            <Button asChild size="sm" variant={failure.retryable ? "default" : "outline"}>
              <Link href={`/app/${workspace}/check`}>
                {failure.retryable ? "Run the check again" : "Start a new check"}
              </Link>
            </Button>
          )}
          {/* the raw string is never thrown away: it is what identifies the fault upstream */}
          {run.errorMessage && (
            <Button size="sm" variant="ghost" onClick={() => setShowRaw((v) => !v)}>
              <ChevronRight
                className={cn("size-3.5 transition-transform", showRaw && "rotate-90")}
              />
              Technical details
            </Button>
          )}
        </div>

        {showRaw && run.errorMessage && (
          <pre className="mt-3 ml-7 overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
            {run.errorMessage}
          </pre>
        )}
      </div>
    </div>
  );
}

function fmtRunTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TerminalState({
  icon: Icon,
  tone,
  title,
  body,
  action,
}: {
  icon: typeof XCircle;
  tone: "error" | "ok";
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-md border bg-card px-6 py-12 text-center raised">
      <Icon className={cn("size-7", tone === "error" ? "text-destructive" : "text-success")} />
      <h2 className="font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

function AllClear({ resourceCount }: { resourceCount: number }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border bg-card px-6 py-14 text-center raised">
      <CheckCircle2 className="size-7 text-success" />
      <h2 className="font-medium">Conformant</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {resourceCount} {resourceCount === 1 ? "resource was" : "resources were"} scanned against US
        Core and passed with no open errors.
      </p>
    </div>
  );
}

function FilteredZero({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border bg-card px-6 py-14 text-center raised">
      <TriangleAlert className="size-7 text-muted-foreground" />
      <h2 className="font-medium">No findings match these filters</h2>
      <p className="text-sm text-muted-foreground">Clear the filters to see the full report.</p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

function InProgress({
  runId,
  status,
  onCancel,
  cancelling,
}: {
  runId: string;
  status: "queued" | "running";
  onCancel: () => void;
  cancelling: boolean;
}) {
  const slow = useElapsedPast(2000);
  const veryLong = useElapsedPast(10000);

  return (
    <div className="space-y-4 py-6">
      <div className="flex items-center gap-2.5">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm">{status === "queued" ? "Queued" : "Checking this record"}</span>
        <span className="font-mono text-xs text-muted-foreground">{runId}</span>
      </div>

      {slow && (
        <p className="max-w-prose text-sm text-muted-foreground">
          Converting, validating against US Core, deriving safe fixes, then re-verifying. This runs
          against the real HAPI validator, so a cold pool takes longer than usual.
        </p>
      )}

      {veryLong && (
        <Button variant="outline" size="sm" onClick={onCancel} disabled={cancelling}>
          {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Cancel this run
        </Button>
      )}
    </div>
  );
}

function useElapsedPast(ms: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPast(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return past;
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-28 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
      <div className="h-14 animate-pulse rounded-md bg-muted" />
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}

// re-export DiffView so tests import from the report barrel if needed.
export { DiffView };
