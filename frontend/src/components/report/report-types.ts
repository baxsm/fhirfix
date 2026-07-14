// shared types + presentation tokens for the remediation report. kept in one
// place so the report view, finding card, facets, and share page stay consistent.

export type Severity = "error" | "warning" | "info";
export type FixStatus = "applied" | "suggested" | "skipped" | "manual_needed" | "dismissed";
export type FixConfidence = "auto" | "one_click" | "manual";
export type Category =
  | "structural"
  | "profile"
  | "terminology"
  | "cardinality"
  | "invariant"
  | "reference"
  | "must_support";

export interface FindingRow {
  id: string;
  severity: Severity;
  category: string;
  ruleSource: string;
  specCitation: string;
  resourceType: string | null;
  fhirpath: string | null;
  rawValidatorMessage: string;
  plainMessage: string;
  suggestedFix: string;
  fixConfidence: FixConfidence;
  fixStatus: FixStatus;
  dedupFingerprint: string;
  occurrenceCount: number;
  rank: number;
}

// left-rail severity color. color + icon + label are all applied, never color alone.
export const SEVERITY_RAIL: Record<Severity, string> = {
  error: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-sky-500",
};

export const SEVERITY_TONE: Record<Severity, string> = {
  error: "text-red-400 border-red-500/30 bg-red-500/10",
  warning: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  info: "text-sky-400 border-sky-500/30 bg-sky-500/10",
};

export const STATUS_TONE: Record<FixStatus, string> = {
  applied: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  suggested: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  manual_needed: "border-muted bg-muted/40 text-muted-foreground",
  skipped: "border-muted bg-muted/40 text-muted-foreground",
  dismissed: "border-muted bg-muted/40 text-muted-foreground line-through",
};

export const STATUS_LABEL: Record<FixStatus, string> = {
  applied: "Applied",
  suggested: "Fixable",
  manual_needed: "Needs review",
  skipped: "Skipped",
  dismissed: "Dismissed",
};

// a fix is one-click applicable when it is safe (suggested) and deterministic.
export function isOneClick(f: FindingRow): boolean {
  return f.fixStatus === "suggested" && f.fixConfidence !== "manual";
}
