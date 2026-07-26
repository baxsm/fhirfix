import { and, desc, eq, ne } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";

// drift detection: compare one scheduled run against the check's baseline and the
// previous run of the same check, and emit an alert per regression found.
//
// the pure comparison (detectDrift) is separated from the db so the threshold
// logic is directly testable without a scheduled run existing. persistDriftAlerts
// is the only part that touches postgres.

export type DriftType =
  | "pass_rate_drop"
  | "new_error_class"
  | "unmapped_authority"
  | "ig_version_change";

export type DriftSeverity = "error" | "warning" | "info";

export interface BaselineConfig {
  minPassRate?: number; // 0-100 floor on the conformance score, as a percentage
  maxErrorDelta?: number; // allowed growth in error-severity findings vs the previous run
}

// one run reduced to the facts drift compares on. built from the run row + its
// findings, so detectDrift never needs the db.
export interface DriftSnapshot {
  runId: string;
  // 0-1000 engine scale. null when the run produced no score (failed/empty).
  conformanceScoreAfter: number | null;
  errorCount: number;
  // dedup fingerprints of error findings, used to spot a class that is new
  // relative to the previous run.
  errorFingerprints: string[];
  // human label per fingerprint, for the alert detail line.
  fingerprintLabels: Record<string, string>;
  // source authorities the engine could not map (auto-learn suggestions).
  unmappedAuthorities: string[];
  igVersions: Record<string, string>;
}

export interface DetectedDrift {
  type: DriftType;
  severity: DriftSeverity;
  metricBefore: string | null;
  metricAfter: string | null;
  detail: string;
}

// the engine scores 0-1000; baselines are expressed as a percentage because that
// is what a human sets in the form. one conversion, in one place.
const SCORE_SCALE = 1000;

export function scoreToPassRate(score: number): number {
  return (score / SCORE_SCALE) * 100;
}

// compare `current` against the baseline config and (when present) the previous
// run of the same check. returns every regression found; an empty array means the
// run is healthy. never throws - a malformed baseline just yields no alert for
// that rule rather than failing the whole run.
export function detectDrift(args: {
  current: DriftSnapshot;
  previous: DriftSnapshot | null;
  baseline: BaselineConfig | null;
}): DetectedDrift[] {
  const { current, previous, baseline } = args;
  const alerts: DetectedDrift[] = [];

  // 1. pass rate dropped below the configured floor.
  // guarded on != null, not truthiness: a score of 0 is a real (and maximally
  // bad) score, and `score &&` would silently skip exactly the worst case.
  const minPassRate = baseline?.minPassRate;
  if (minPassRate != null && current.conformanceScoreAfter != null) {
    const rate = scoreToPassRate(current.conformanceScoreAfter);
    if (rate < minPassRate) {
      const previousRate =
        previous?.conformanceScoreAfter != null
          ? `${scoreToPassRate(previous.conformanceScoreAfter).toFixed(1)}%`
          : null;
      alerts.push({
        type: "pass_rate_drop",
        severity: "error",
        metricBefore: previousRate ?? `${minPassRate}% floor`,
        metricAfter: `${rate.toFixed(1)}%`,
        detail: `Conformance ${rate.toFixed(1)}% is below the ${minPassRate}% floor.`,
      });
    }
  }

  // 2. error findings grew by more than the allowed delta vs the previous run.
  // only meaningful with a previous run to compare against.
  const maxErrorDelta = baseline?.maxErrorDelta;
  if (maxErrorDelta != null && previous) {
    const delta = current.errorCount - previous.errorCount;
    if (delta > maxErrorDelta) {
      alerts.push({
        type: "pass_rate_drop",
        severity: "warning",
        metricBefore: String(previous.errorCount),
        metricAfter: String(current.errorCount),
        detail: `Errors rose by ${delta} (limit ${maxErrorDelta}) since the last check.`,
      });
    }
  }

  // 3. an error class that did not appear in the previous run. this fires without
  // any baseline config, because a brand new kind of failure is worth saying
  // regardless of thresholds. the first run of a check has no previous, so every
  // class would be "new" - skipped rather than alerting on the whole first run.
  if (previous) {
    const known = new Set(previous.errorFingerprints);
    const fresh = current.errorFingerprints.filter((f) => !known.has(f));
    for (const fingerprint of fresh) {
      alerts.push({
        type: "new_error_class",
        severity: "warning",
        metricBefore: null,
        metricAfter: fingerprint,
        detail: current.fingerprintLabels[fingerprint] ?? `New error class ${fingerprint}.`,
      });
    }
  }

  // 4. an authority the registry could not map. one alert per distinct authority,
  // pointing at the registry where a human can approve the suggestion.
  for (const authority of unique(current.unmappedAuthorities)) {
    alerts.push({
      type: "unmapped_authority",
      severity: "info",
      metricBefore: null,
      metricAfter: authority,
      detail: `No mapping for authority "${authority}". Approve a suggestion in the registry to auto-fix it.`,
    });
  }

  // 5. an IG version moved under the check. real IG-publish detection is not
  // triggerable on demand, so this compares the versions the engine reports
  // between two runs - which is what actually matters to the caller.
  if (previous) {
    for (const [pkg, version] of Object.entries(current.igVersions)) {
      const before = previous.igVersions[pkg];
      if (before && before !== version) {
        alerts.push({
          type: "ig_version_change",
          severity: "info",
          metricBefore: `${pkg} ${before}`,
          metricAfter: `${pkg} ${version}`,
          detail: `${pkg} moved from ${before} to ${version} between checks.`,
        });
      }
    }
  }

  return alerts;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((v) => v.length > 0))];
}

// build a snapshot from a persisted run. used for both the current run and the
// previous one, so the two sides of the comparison are always derived the same way.
export async function loadSnapshot(db: Db, runId: string): Promise<DriftSnapshot | null> {
  const [run] = await db
    .select({
      id: schema.run.id,
      conformanceScoreAfter: schema.run.conformanceScoreAfter,
      igVersions: schema.run.igVersions,
    })
    .from(schema.run)
    .where(eq(schema.run.id, runId))
    .limit(1);

  if (!run) return null;

  const findings = await db
    .select({
      severity: schema.finding.severity,
      dedupFingerprint: schema.finding.dedupFingerprint,
      plainMessage: schema.finding.plainMessage,
      category: schema.finding.category,
      ruleSource: schema.finding.ruleSource,
    })
    .from(schema.finding)
    .where(eq(schema.finding.runId, runId));

  const errors = findings.filter((f) => f.severity === "error");
  const fingerprintLabels: Record<string, string> = {};
  for (const f of errors) {
    fingerprintLabels[f.dedupFingerprint] ??= f.plainMessage;
  }

  return {
    runId: run.id,
    conformanceScoreAfter: run.conformanceScoreAfter,
    errorCount: errors.length,
    errorFingerprints: unique(errors.map((f) => f.dedupFingerprint)),
    fingerprintLabels,
    unmappedAuthorities: unique(
      findings.filter((f) => f.category === "terminology").map((f) => f.ruleSource),
    ),
    igVersions: run.igVersions ?? {},
  };
}

// the previous completed run of the same scheduled check, excluding the run being
// evaluated. this is what "since the last check" means in every alert message.
export async function loadPreviousRunId(
  db: Db,
  scheduledCheckId: string,
  excludeRunId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: schema.run.id })
    .from(schema.run)
    .where(
      and(
        eq(schema.run.actorId, scheduledCheckId),
        eq(schema.run.actorType, "scheduled"),
        eq(schema.run.status, "completed"),
        ne(schema.run.id, excludeRunId),
      ),
    )
    .orderBy(desc(schema.run.createdAt))
    .limit(1);
  return row?.id ?? null;
}

// write the detected alerts. returns the persisted rows so the caller can deliver
// them without a re-read.
export async function persistDriftAlerts(
  db: Db,
  args: {
    workspaceId: string;
    scheduledCheckId: string;
    runId: string;
    alerts: DetectedDrift[];
    makeId: () => string;
  },
): Promise<Array<DetectedDrift & { id: string }>> {
  if (args.alerts.length === 0) return [];

  const rows = args.alerts.map((a) => ({
    id: args.makeId(),
    workspaceId: args.workspaceId,
    scheduledCheckId: args.scheduledCheckId,
    runId: args.runId,
    type: a.type,
    severity: a.severity,
    metricBefore: a.metricBefore,
    metricAfter: a.metricAfter,
    detail: a.detail,
  }));

  await db.insert(schema.driftAlert).values(rows);
  return rows.map((row, i) => ({ ...(args.alerts[i] as DetectedDrift), id: row.id }));
}
