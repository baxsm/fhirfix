"use client";

import {
  AlertCircle,
  ChevronRight,
  Info,
  Loader2,
  Sparkles,
  TriangleAlert,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DiffView } from "./diff-view";
import {
  type FindingRow,
  isOneClick,
  type Severity,
  STATUS_LABEL,
  STATUS_TONE,
} from "./report-types";

const SEVERITY_ICON: Record<Severity, typeof AlertCircle> = {
  error: AlertCircle,
  warning: TriangleAlert,
  info: Info,
};

function fragmentFor(fhirpath: string | null, before: string, after: string) {
  if (!fhirpath) return { before, after };
  // the leaf element name is the most stable anchor across before/after.
  const leaf = fhirpath.split(/[.[]/).filter(Boolean).pop() ?? "";
  if (!leaf) return { before, after };
  const grab = (src: string) => {
    const lines = src.split("\n");
    const hit = lines.findIndex((l) => l.includes(`"${leaf}"`));
    if (hit < 0) return src;
    const start = Math.max(0, hit - 2);
    const end = Math.min(lines.length, hit + 6);
    return lines.slice(start, end).join("\n");
  };
  return { before: grab(before), after: grab(after) };
}

export function FindingCard({
  finding,
  before,
  after,
  busy,
  onApply,
  onFixWithAi,
  onDismiss,
  readOnly = false,
}: {
  finding: FindingRow;
  before: string | null;
  after: string | null;
  busy: boolean;
  onApply?: (f: FindingRow) => void;
  onFixWithAi?: (f: FindingRow) => void;
  onDismiss?: (f: FindingRow) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const Icon = SEVERITY_ICON[finding.severity];
  const applied = finding.fixStatus === "applied";
  const dismissed = finding.fixStatus === "dismissed";
  const canApply = isOneClick(finding);
  const canAi = finding.fixStatus === "manual_needed" || finding.fixConfidence === "manual";

  const fragment = before && after ? fragmentFor(finding.fhirpath, before, after) : null;

  return (
    <article
      className={cn(
        "group/finding relative transition-opacity",
        dismissed && "opacity-55",
        open && "bg-muted/40",
      )}
    >
      <div className="border-b group-last/finding:border-b-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="row-interactive flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left"
          aria-expanded={open}
        >
          <ChevronRight
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
          <Icon
            className={cn(
              "mt-0.5 size-4 shrink-0",
              finding.severity === "error"
                ? "text-destructive"
                : finding.severity === "warning"
                  ? "text-warning"
                  : "text-info",
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-sm">{finding.plainMessage}</span>
              {finding.occurrenceCount > 1 && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                  ×{finding.occurrenceCount}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
              {finding.fhirpath && (
                <span className="font-mono text-muted-foreground">{finding.fhirpath}</span>
              )}
              <span className="capitalize text-muted-foreground">{finding.category}</span>
            </div>
          </div>
          {/* no severity badge here: the coloured icon on the left already
              states it, and the word appeared twice on every row. only the fix
              STATUS gets a badge, because nothing else on the row says it. */}
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className={STATUS_TONE[finding.fixStatus]}>
              {applied && <Wrench className="mr-1 size-3" />}
              {STATUS_LABEL[finding.fixStatus]}
            </Badge>
          </div>
        </button>

        {open && (
          <div className="space-y-4 border-t px-3 py-3 pl-7">
            <div>
              <p className="text-sm text-muted-foreground">{finding.suggestedFix}</p>
            </div>

            {fragment && (
              <DiffView
                before={fragment.before}
                after={fragment.after}
                beforeLabel="Submitted"
                afterLabel="Corrected"
              />
            )}

            <details className="group">
              <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                Why we flagged this
              </summary>
              {/* solid tokens only: stacked opacities here measured 1.0:1. */}
              <div className="mt-2 space-y-1.5 rounded-md border bg-muted px-3 py-2 text-[11px]">
                <p>
                  <span className="text-muted-foreground">Rule:</span>{" "}
                  <span className="font-mono text-foreground">{finding.ruleSource}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Spec:</span>{" "}
                  <span className="font-mono text-foreground">{finding.specCitation}</span>
                </p>
                <p className="font-mono text-muted-foreground">{finding.rawValidatorMessage}</p>
              </div>
            </details>

            {!readOnly && !applied && !dismissed && (
              <div className="flex flex-wrap items-center gap-2">
                {canApply && onApply && (
                  <Button
                    variant="success"
                    size="sm"
                    disabled={busy}
                    onClick={() => onApply(finding)}
                  >
                    {busy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Wrench className="size-3.5" />
                    )}
                    Apply fix
                  </Button>
                )}
                {canAi && onFixWithAi && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onFixWithAi(finding)}
                  >
                    <Sparkles className="size-3.5" />
                    Fix with AI
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onDismiss(finding)}
                    className="text-muted-foreground"
                  >
                    <X className="size-3.5" />
                    Dismiss
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
