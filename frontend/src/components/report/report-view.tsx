"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileWarning,
  Loader2,
  Share2,
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
import { FindingCard } from "./finding-card";
import type { FindingRow, Severity } from "./report-types";
import { ShareDialog } from "./share-dialog";

const SEVERITY_LABEL: Record<Severity, string> = {
  error: "Errors",
  warning: "Warnings",
  info: "Info",
};

function ScoreDelta({ before, after }: { before: number | null; after: number | null }) {
  const gain = before != null && after != null ? after - before : null;
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 raised">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Before</span>
        <span className="font-mono text-base tabular-nums text-muted-foreground">
          {before ?? "-"}
        </span>
      </div>
      <ArrowRight className="size-4 text-muted-foreground/50" />
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">After</span>
        <span className="font-mono text-base tabular-nums text-emerald-400">{after ?? "-"}</span>
      </div>
      {gain != null && gain > 0 && (
        <span className="ml-1 font-mono text-[11px] text-emerald-400 tabular-nums">+{gain}</span>
      )}
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
  const tone =
    severity === "error"
      ? "text-red-400"
      : severity === "warning"
        ? "text-amber-400"
        : "text-sky-400";
  const dot =
    severity === "error" ? "bg-red-500" : severity === "warning" ? "bg-amber-500" : "bg-sky-500";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] transition-colors",
        active ? "border-primary/40 bg-primary/10" : "hover:bg-muted",
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot)} />
      <span className={tone}>{SEVERITY_LABEL[severity]}</span>
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
  };
  findings: FindingRow[];
  corrected: string | null;
  input: string | null;
  share: {
    token: string;
    redacted: boolean;
    expiresAt: string | Date | null;
    revokedAt: string | Date | null;
  } | null;
}

export function ReportView({ workspaceId, runId }: { workspaceId: string; runId: string }) {
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
  const [shareOpen, setShareOpen] = useState(false);
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
        body={query.error?.message ?? "Something went wrong."}
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!run || (query.isLoading && !data)) {
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
    return (
      <TerminalState
        icon={FileWarning}
        tone="error"
        title="Check failed"
        body={run.errorMessage ?? "The run did not complete."}
        action={
          <Button asChild variant="outline">
            <Link href="new">Run another check</Link>
          </Button>
        }
      />
    );
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
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm text-muted-foreground">{run.id}</h1>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                {run.inputType}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {run.resourceCount} {run.resourceCount === 1 ? "resource" : "resources"} scanned ·{" "}
              {findings.length} {findings.length === 1 ? "finding" : "findings"}
              {applied > 0 && <span className="text-emerald-400"> · {applied} auto-fixed</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="size-3.5" />
              Share
            </Button>
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

        <div className="flex flex-wrap items-center gap-3">
          {(["error", "warning", "info"] as Severity[]).map((s) => (
            <SeverityChip
              key={s}
              severity={s}
              count={counts[s]}
              active={facets.severities.has(s)}
              onClick={() => toggleChip(s)}
            />
          ))}
          <div className="ml-auto">
            <ScoreDelta before={run.conformanceScoreBefore} after={run.conformanceScoreAfter} />
          </div>
        </div>

        {/* the highest-leverage line: turns a scary total into one action. */}
        {fixableNow.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 raised">
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="size-4 text-primary" />
              <span>
                <span className="font-medium text-foreground">{fixableNow.length}</span> of{" "}
                {active.length} findings are safely auto-fixable.
              </span>
            </div>
            <Button size="sm" disabled={applyingAll || isBusy} onClick={applyAllSafe}>
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
          <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 raised">
            <CheckCircle2 className="size-4" />
            Re-verified clean. No conformance errors remain.
          </div>
        ) : null}
      </header>

      {/* body: facets + list */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <FacetSidebar
          findings={findings}
          facets={facets}
          preset={preset}
          onPreset={setPresetAndFacets}
          onFacets={setFacets}
        />

        <div className="min-w-0 flex-1 space-y-2">
          {allClear ? (
            <AllClear resourceCount={run.resourceCount} />
          ) : shown.length === 0 ? (
            <FilteredZero onClear={() => setPresetAndFacets("all")} />
          ) : (
            shown.map((f) => (
              <FindingCard
                key={f.id}
                finding={f}
                before={data?.input ?? null}
                after={data?.corrected ?? null}
                busy={busyFp === f.dedupFingerprint || (applyingAll && f.fixStatus === "suggested")}
                onApply={onApply}
                onFixWithAi={onAi}
                onDismiss={onDismiss}
              />
            ))
          )}
        </div>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        workspaceId={workspaceId}
        runId={runId}
        existing={data?.share ?? null}
        client={client}
        onChanged={() => invalidate()}
      />
    </div>
  );
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
      <Icon className={cn("size-8", tone === "error" ? "text-red-400" : "text-emerald-400")} />
      <h2 className="font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

function AllClear({ resourceCount }: { resourceCount: number }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-6 py-14 text-center raised">
      <CheckCircle2 className="size-9 text-emerald-400" />
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
  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div className="flex flex-col items-center gap-4 rounded-md border bg-card px-6 py-12 text-center raised">
        <Loader2 className="size-8 animate-spin text-primary" />
        <div>
          <h2 className="font-medium">
            {status === "queued" ? "Queued" : "Validating and remediating"}
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{runId}</p>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          Converting, validating against US Core, deriving safe fixes, and re-verifying. This runs
          against the real HAPI validator, so a cold pool can take a moment.
        </p>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={cancelling}>
          {cancelling ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Cancel
        </Button>
      </div>
    </div>
  );
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
