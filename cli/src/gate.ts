import type { Finding, FixStatus, Severity } from "fhirfix";

// the gate decision, kept pure and separate from i/o so it can be unit tested and
// so the github action can reuse the exact same rule the CLI applies.

export type Threshold = Severity;

// severity ordering, most severe first. a threshold of "warning" means errors AND
// warnings trip the gate; "info" means everything does.
const RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

// an "applied" finding is one the engine already fixed in the artifact it handed
// back: it describes what WAS wrong with the input, not what is wrong with the
// output. gating on it would fail a build that fix() just made conformant, so
// `fhirfix fix` could never pass. only findings that survive into the corrected
// artifact can trip the gate.
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
  // counts describe the OUTPUT artifact, so they exclude what fix() already
  // applied. otherwise "1 error" would print next to a passing exit code.
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
