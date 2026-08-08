"use client";

import { AlertCircle, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FindingRow, type Severity, STATUS_LABEL } from "./report-types";

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

export function FindingListRow({
  finding,
  selected,
  onSelect,
}: {
  finding: FindingRow;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = SEVERITY_ICON[finding.severity];
  const dismissed = finding.fixStatus === "dismissed";
  const needsReview = finding.fixStatus === "manual_needed";

  return (
    <button
      type="button"
      data-finding-row
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "row-interactive flex w-full cursor-pointer items-start gap-2.5 border-b px-3 py-2.5 text-left last:border-b-0 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "bg-secondary hover:bg-secondary",
        dismissed && "opacity-55",
      )}
    >
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", SEVERITY_COLOR[finding.severity])} />
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-[13px] leading-snug", selected && "font-medium")}>
          {finding.plainMessage}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {finding.fhirpath && (
            <span className="truncate font-mono text-[0.75rem] text-muted-foreground">
              {finding.fhirpath}
            </span>
          )}
          {finding.occurrenceCount > 1 && (
            <span className="shrink-0 font-mono text-[0.75rem] text-muted-foreground tabular-nums">
              ×{finding.occurrenceCount}
            </span>
          )}
        </div>
      </div>
      {/* only the state that wants a human gets a marker in the list */}
      {needsReview && (
        <span className="mt-0.5 shrink-0 rounded border border-warning/35 bg-warning/[0.06] px-1.5 py-0.5 text-[0.75rem] text-warning">
          {STATUS_LABEL[finding.fixStatus]}
        </span>
      )}
    </button>
  );
}
