"use client";

import { ArrowRight, CheckCircle2, Copy, Loader2, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

interface DemoSample {
  id: string;
  label: string;
  kind: string;
  description: string;
  content: string;
}

interface DemoFinding {
  severity: "error" | "warning" | "info";
  category: string;
  fhirpath: string | null;
  plainMessage: string;
  suggestedFix: string;
  fixStatus: string;
  occurrenceCount: number;
}

interface DemoResult {
  scoreBefore: number;
  scoreAfter: number;
  reVerifiedClean: boolean;
  findingsTotal: number;
  findingsAutoFixable: number;
  findings: DemoFinding[];
  corrected: string;
}

const SEV_DOT: Record<string, string> = {
  error: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

// the live marketing playground: paste FHIR/HL7v2, run it through the REAL engine
// (rate-limited public demo endpoint), see the ranked report. gated on volume, not
// correctness, so it shows the genuine product output, never a canned mock.
export function PlaygroundPanel({ compact = false }: { compact?: boolean }) {
  const [samples, setSamples] = useState<DemoSample[]>([]);
  const [content, setContent] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"findings" | "corrected">("findings");

  const run = useCallback(async (raw: string) => {
    if (!raw.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/demo/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: raw }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.message ?? "The demo is busy. Try again shortly.");
        setResult(null);
        return;
      }
      setResult((await res.json()) as DemoResult);
    } catch {
      setError("Could not reach the demo engine.");
    } finally {
      setLoading(false);
    }
  }, []);

  // on mount: load the sample library and run the first one so the panel lands
  // showing a real report, not an empty shell.
  useEffect(() => {
    let active = true;
    fetch(`${env.NEXT_PUBLIC_API_URL}/api/demo/samples`)
      .then((r) => r.json())
      .then((d: { samples: DemoSample[] }) => {
        if (!active) return;
        setSamples(d.samples);
        const first = d.samples[0];
        if (first) {
          setContent(first.content);
          void run(first.content);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [run]);

  return (
    <div className="overflow-hidden rounded-lg border bg-card raised">
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-3 py-2">
        {samples.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setContent(s.content);
              void run(s.content);
            }}
            className="cursor-pointer rounded border bg-background px-2 py-1 text-[11px] hover:border-primary/40"
          >
            {s.label}
            <span className="ml-1.5 font-mono text-[9px] uppercase text-muted-foreground">
              {s.kind === "hl7v2" ? "HL7v2" : "FHIR"}
            </span>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2">
        {/* input */}
        <div className="flex flex-col border-b md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Input</span>
            <Button
              size="sm"
              onClick={() => run(content)}
              disabled={loading}
              className="h-6 px-2 text-[11px]"
            >
              {loading ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
              Run
            </Button>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className={cn(
              "w-full resize-none bg-transparent p-3 font-mono text-[11px] leading-relaxed outline-none",
              compact ? "h-[260px]" : "h-[340px]",
            )}
          />
        </div>

        {/* result */}
        <div className={cn("flex flex-col", compact ? "h-[300px]" : "h-[380px]")}>
          <div className="flex items-center justify-between border-b px-3 py-1.5">
            <div className="flex gap-3 text-[11px]">
              <button
                type="button"
                onClick={() => setTab("findings")}
                className={cn(
                  "cursor-pointer",
                  tab === "findings" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                Findings
              </button>
              <button
                type="button"
                onClick={() => setTab("corrected")}
                className={cn(
                  "cursor-pointer",
                  tab === "corrected" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                Corrected
              </button>
            </div>
            {result && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
                <span className="text-muted-foreground">{result.scoreBefore}</span>
                <ArrowRight className="size-3 text-muted-foreground/50" />
                <span className="text-emerald-400">{result.scoreAfter}</span>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {error ? (
              <div className="p-4 text-xs text-muted-foreground">{error}</div>
            ) : !result ? (
              <div className="flex h-full items-center justify-center p-4 text-xs text-muted-foreground">
                {loading ? "Running against US Core..." : "Run a sample to see the report."}
              </div>
            ) : tab === "findings" ? (
              <div className="divide-y">
                {result.reVerifiedClean && (
                  <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    Re-verified clean · {result.findingsAutoFixable} auto-fixed
                  </div>
                )}
                {result.findings.map((f, i) => (
                  <div key={`${f.fhirpath}-${i}`} className="px-3 py-2">
                    <div className="flex items-start gap-2">
                      <span
                        className={cn("mt-1 size-1.5 shrink-0 rounded-full", SEV_DOT[f.severity])}
                      />
                      <div className="min-w-0">
                        <p className="text-xs">{f.plainMessage}</p>
                        {f.fhirpath && (
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {f.fhirpath}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(result.corrected)}
                  className="absolute right-2 top-2 cursor-pointer rounded border bg-background/80 p-1 text-muted-foreground hover:text-foreground"
                >
                  <Copy className="size-3" />
                </button>
                <pre className="whitespace-pre-wrap break-all p-3 font-mono text-[11px] leading-relaxed">
                  {result.corrected}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
