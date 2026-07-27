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
