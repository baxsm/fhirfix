"use client";

import { AlertCircle, Info, Loader2, Sparkles, TriangleAlert, Wrench, X } from "lucide-react";
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

const SEVERITY_COLOR: Record<Severity, string> = {
  error: "text-destructive",
  warning: "text-warning",
  info: "text-info",
};

function fragmentFor(fhirpath: string | null, before: string, after: string) {
  if (!fhirpath) return { before, after };
  const leaf = fhirpath.split(/[.[]/).filter(Boolean).pop() ?? "";
  if (!leaf) return { before, after };
  const grab = (src: string) => {
    const lines = src.split("\n");
    const hit = lines.findIndex((l) => l.includes(`"${leaf}"`));
    if (hit < 0) return src;
    return lines.slice(Math.max(0, hit - 2), Math.min(lines.length, hit + 6)).join("\n");
  };
  return { before: grab(before), after: grab(after) };
}

export function FindingDetail({
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
  const Icon = SEVERITY_ICON[finding.severity];
  const applied = finding.fixStatus === "applied";
  const dismissed = finding.fixStatus === "dismissed";
  const canApply = isOneClick(finding);
  const canAi = finding.fixStatus === "manual_needed" || finding.fixConfidence === "manual";
  const showActions = !readOnly && !applied && !dismissed && (canApply || canAi || !!onDismiss);

  const fragment = before && after ? fragmentFor(finding.fhirpath, before, after) : null;

  return (
    <div className="flex max-h-[560px] flex-col">
      <div className="flex items-start gap-2.5 border-b px-4 py-3">
        <Icon className={cn("mt-0.5 size-4 shrink-0", SEVERITY_COLOR[finding.severity])} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{finding.plainMessage}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.6875rem]">
            {finding.fhirpath && (
              <span className="font-mono text-muted-foreground">{finding.fhirpath}</span>
            )}
            <span className="capitalize text-muted-foreground">{finding.category}</span>
            {finding.occurrenceCount > 1 && (
              <span className="font-mono text-muted-foreground tabular-nums">
                {finding.occurrenceCount} occurrences
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className={cn("shrink-0", STATUS_TONE[finding.fixStatus])}>
          {applied && <Wrench className="mr-1 size-3" />}
          {STATUS_LABEL[finding.fixStatus]}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-3.5">
        <p className="text-sm text-muted-foreground">{finding.suggestedFix}</p>

        {fragment && (
          <DiffView
            before={fragment.before}
            after={fragment.after}
            beforeLabel="Submitted"
            afterLabel="Corrected"
          />
        )}

        {/* solid tokens only - this block used to nest text-muted-foreground/80 inside an /80 parent */}
        <div className="space-y-2 rounded-md border bg-muted px-3 py-2.5 text-[0.6875rem] select-none">
          <p className="font-medium text-foreground">Why we flagged this</p>
          <dl className="space-y-1.5">
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted-foreground">Rule</dt>
              <dd className="min-w-0 select-text break-all font-mono text-foreground">
                {finding.ruleSource}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted-foreground">Spec</dt>
              <dd className="min-w-0 select-text break-all font-mono text-foreground">
                {finding.specCitation}
              </dd>
            </div>
          </dl>
          <p className="select-text border-t pt-2 font-mono leading-relaxed text-muted-foreground">
            {finding.rawValidatorMessage}
          </p>
        </div>
      </div>

      {/* actions pinned to the bottom so they stay visible for the selected finding */}
      {showActions && (
        <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-4 py-3">
          {canApply && onApply && (
            <Button variant="success" size="sm" disabled={busy} onClick={() => onApply(finding)}>
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
              className="ml-auto text-muted-foreground"
            >
              <X className="size-3.5" />
              Dismiss
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
