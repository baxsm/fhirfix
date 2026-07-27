import type { Finding, FixStatus, Severity } from "fhirfix";


export type Threshold = Severity;

const RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

export function tripsGate(
  finding: { severity: Severity; fixStatus?: FixStatus },
  threshold: Threshold,
): boolean {
  if (finding.fixStatus === "applied") return false;
  return RANK[finding.severity] >= RANK[threshold];
}

export interface GateSummary {
  total: number;
  errors: number;
  warnings: number;
  infos: number;
  // findings fix() already resolved in the returned artifact. reported, never gated.
  applied: number;
  // the findings at or above the threshold - the ones that fail the build.
  blocking: Finding[];
  passed: boolean;
}

export function summarize(findings: Finding[], threshold: Threshold): GateSummary {
  const outstanding = findings.filter((f) => f.fixStatus !== "applied");
  const blocking = findings.filter((f) => tripsGate(f, threshold));
  return {
    total: outstanding.length,
    errors: outstanding.filter((f) => f.severity === "error").length,
    warnings: outstanding.filter((f) => f.severity === "warning").length,
    infos: outstanding.filter((f) => f.severity === "info").length,
    applied: findings.length - outstanding.length,
    blocking,
    passed: blocking.length === 0,
  };
}

export function isThreshold(value: string): value is Threshold {
  return value === "error" || value === "warning" || value === "info";
}
