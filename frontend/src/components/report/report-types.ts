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

// left-rail severity color. color + icon + label are all applied, never color
// alone. these use semantic tokens rather than raw palette shades - the old
// -400/-500 values were dark-theme colours that read as washed-out pastel on a
// near-white surface.
export const SEVERITY_RAIL: Record<Severity, string> = {
  error: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
};

export const SEVERITY_TONE: Record<Severity, string> = {
  error: "text-destructive border-destructive/30 bg-destructive/[0.06]",
  warning: "text-warning border-warning/35 bg-warning/[0.06]",
  info: "text-info border-info/30 bg-info/[0.06]",
};

// APPLIED IS NEUTRAL. it is the expected outcome of a run with auto-fix on, so
// painting it emerald put a green badge on nearly every row and drowned out the
// one or two findings that still need a human. colour here is reserved for the
// state that wants attention: "needs review".
export const STATUS_TONE: Record<FixStatus, string> = {
  applied: "border-border bg-muted text-muted-foreground",
  suggested: "border-info/30 bg-info/[0.06] text-info",
  manual_needed: "border-warning/35 bg-warning/[0.06] text-warning",
  skipped: "border-border bg-muted text-muted-foreground",
  dismissed: "border-border bg-muted text-muted-foreground line-through",
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
