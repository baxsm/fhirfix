"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, Play, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useListOrganizations } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { SAMPLES } from "./samples";

type Severity = "error" | "warning" | "info";
type FixStatus = "applied" | "suggested" | "skipped" | "manual_needed" | "dismissed";
type FixConfidence = "auto" | "one_click" | "manual";

interface FindingRow {
  id: string;
  severity: Severity;
  category: string;
  ruleSource: string;
  fhirpath: string | null;
  rawValidatorMessage: string;
  plainMessage: string;
  suggestedFix: string;
  fixConfidence: FixConfidence;
  fixStatus: FixStatus;
  occurrenceCount: number;
}

const SEVERITY_TONE: Record<Severity, string> = {
  error: "text-red-400 border-red-500/30 bg-red-500/10",
  warning: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  info: "text-sky-400 border-sky-500/30 bg-sky-500/10",
};

const FIX_TONE: Record<FixStatus, string> = {
  applied: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  suggested: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  manual_needed: "border-muted bg-muted/40 text-muted-foreground",
  skipped: "border-muted bg-muted/40 text-muted-foreground",
  dismissed: "border-muted bg-muted/40 text-muted-foreground",
};

function ScorePill({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex flex-col rounded-md border bg-card px-3 py-2 raised">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-lg tabular-nums">{score ?? "-"}</span>
    </div>
  );
}

export function CheckView({ workspace }: { workspace: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  const trpc = useTRPC();
  const [content, setContent] = useState(SAMPLES[0]?.content ?? "");
  const [runId, setRunId] = useState<string | null>(null);

  const submit = useMutation(
    trpc.run.submit.mutationOptions({
      onSuccess: (res) => {
        setRunId(res.runId);
      },
      onError: (e) => toast.error(e.message ?? "Could not start the check."),
    }),
  );

  const runQuery = useQuery({
    ...trpc.run.get.queryOptions({ workspaceId, runId: runId ?? "" }),
    enabled: !!workspaceId && !!runId,
    // poll while the run is queued/running. keep polling even when the tab is not
    // focused (the automation/preview tab often isn't) so a completed run always
    // resolves in the UI, not just after a manual refetch.
    refetchInterval: (query) => {
      const status = query.state.data?.run.status;
      return status === "queued" || status === "running" ? 1000 : false;
    },
    refetchIntervalInBackground: true,
  });

  const run = runQuery.data?.run;
  const findings = (runQuery.data?.findings ?? []) as FindingRow[];
  const corrected = runQuery.data?.corrected ?? null;
  const isRunning = run?.status === "queued" || run?.status === "running";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">New check</h1>
        <p className="text-sm text-muted-foreground">
          Paste FHIR or HL7v2, or load a sample. The engine converts, validates against US Core,
          auto-fixes what it safely can, and re-verifies.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setContent(s.content);
              setRunId(null);
            }}
            className="cursor-pointer rounded-md border bg-card px-3 py-1.5 text-left text-xs raised hover:border-primary/40"
          >
            <span className="font-medium">{s.label}</span>
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">{s.kind}</span>
          </button>
        ))}
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        className="min-h-[220px] font-mono text-xs"
        placeholder="Paste a FHIR resource, a bundle, or an HL7v2 message..."
      />

      <div className="flex items-center gap-3">
        <Button
          type="button"
          disabled={!workspaceId || !content.trim() || submit.isPending || isRunning}
          onClick={() => submit.mutate({ workspaceId, content, autoFix: true })}
        >
          {submit.isPending || isRunning ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {isRunning ? "Running..." : "Run check"}
        </Button>
        {run && (
          <span className="font-mono text-xs text-muted-foreground">
            {run.id} - {run.status}
          </span>
        )}
      </div>

      {run?.status === "failed" && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Check failed</p>
            <p className="font-mono text-xs opacity-80">{run.errorMessage}</p>
          </div>
        </div>
      )}

      {run?.status === "completed" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <ScorePill label="Score before" score={run.conformanceScoreBefore} />
            <span className="text-muted-foreground">-&gt;</span>
            <ScorePill label="Score after" score={run.conformanceScoreAfter} />
            <div className="ml-auto flex items-center gap-2 text-sm">
              {run.conformanceScoreAfter != null &&
              run.conformanceScoreBefore != null &&
              run.conformanceScoreAfter >= run.conformanceScoreBefore &&
              findings.filter((f) => f.severity === "error" && f.fixStatus !== "applied").length ===
                0 ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="size-4" /> Re-verified clean
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {findings.filter((f) => f.severity === "error").length} errors remain
                </span>
              )}
            </div>
          </div>

          <Tabs defaultValue="findings">
            <TabsList>
              <TabsTrigger value="findings">Findings ({findings.length})</TabsTrigger>
              <TabsTrigger value="corrected">Corrected output</TabsTrigger>
            </TabsList>

            <TabsContent value="findings" className="space-y-2 pt-2">
              {findings.length === 0 ? (
                <p className="rounded-md border bg-card p-4 text-sm text-muted-foreground raised">
                  No findings. The resource is conformant.
                </p>
              ) : (
                findings.map((f) => (
                  <article key={f.id} className="rounded-md border bg-card p-4 raised">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("capitalize", SEVERITY_TONE[f.severity])}
                      >
                        {f.severity}
                      </Badge>
                      <Badge variant="outline" className={cn("capitalize", FIX_TONE[f.fixStatus])}>
                        {f.fixStatus === "applied" && <Wrench className="mr-1 size-3" />}
                        {f.fixStatus.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">{f.category}</span>
                      {f.occurrenceCount > 1 && (
                        <span className="font-mono text-xs text-muted-foreground">
                          x{f.occurrenceCount}
                        </span>
                      )}
                      {f.fhirpath && (
                        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                          {f.fhirpath}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm">{f.plainMessage}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.suggestedFix}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] text-muted-foreground/70 hover:text-muted-foreground">
                        Raw validator message - {f.ruleSource}
                      </summary>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">
                        {f.rawValidatorMessage}
                      </p>
                    </details>
                  </article>
                ))
              )}
            </TabsContent>

            <TabsContent value="corrected" className="pt-2">
              <pre className="max-h-[480px] overflow-auto rounded-md border bg-card p-4 font-mono text-xs raised">
                {corrected ?? "No corrected output."}
              </pre>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
