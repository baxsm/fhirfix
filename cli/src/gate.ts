import type { Finding, Severity } from "fhirfix";

// the gate decision, kept pure and separate from i/o so it can be unit tested and
// so the github action can reuse the exact same rule the CLI applies.

export type Threshold = Severity;

// severity ordering, most severe first. a threshold of "warning" means errors AND
// warnings trip the gate; "info" means everything does.
const RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

export function tripsGate(finding: { severity: Severity }, threshold: Threshold): boolean {
  return RANK[finding.severity] >= RANK[threshold];
}

export interface GateSummary {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  // the findings at or above the threshold - the ones that fail the build.
  blocking: Finding[];
  passed: boolean;
}

export function summarize(findings: Finding[], threshold: Threshold): GateSummary {
  const blocking = findings.filter((f) => tripsGate(f, threshold));
  return {
    total: findings.length,
    errors: findings.filter((f) => f.severity === "error").length,
    warnings: findings.filter((f) => f.severity === "warning").length,
    infos: findings.filter((f) => f.severity === "info").length,
    blocking,
    passed: blocking.length === 0,
  };
}

export function isThreshold(value: string): value is Threshold {
  return value === "error" || value === "warning" || value === "info";
}
