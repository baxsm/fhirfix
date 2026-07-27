import { and, desc, eq, gte, ne } from "drizzle-orm";
import type { Db } from "./client";
import * as schema from "./schema/index";


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

export interface DriftSnapshot {
  runId: string;
  // 0-1000 engine scale. null when the run produced no score (failed/empty).
  conformanceScoreAfter: number | null;
  errorCount: number;
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

const SCORE_SCALE = 1000;

export function scoreToPassRate(score: number): number {
  return (score / SCORE_SCALE) * 100;
}

// must never throw: a malformed snapshot returns no drift rather than failing the run
export function detectDrift(args: {
  current: DriftSnapshot;
  previous: DriftSnapshot | null;
  baseline: BaselineConfig | null;
}): DetectedDrift[] {
  const { current, previous, baseline } = args;
  const alerts: DetectedDrift[] = [];

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

  for (const authority of unique(current.unmappedAuthorities)) {
    alerts.push({
      type: "unmapped_authority",
      severity: "info",
      metricBefore: null,
      metricAfter: authority,
      detail: `No mapping for authority "${authority}". Approve a suggestion in the registry to auto-fix it.`,
    });
  }

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

export async function loadSnapshot(db: Db, runId: string): Promise<DriftSnapshot | null> {
  const [run] = await db
    .select({
      id: schema.run.id,
      workspaceId: schema.run.workspaceId,
      createdAt: schema.run.createdAt,
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
    unmappedAuthorities: await loadUnmappedAuthorities(db, run.workspaceId, run.createdAt),
    igVersions: run.igVersions ?? {},
  };
}

async function loadUnmappedAuthorities(
  db: Db,
  workspaceId: string,
  runCreatedAt: Date,
): Promise<string[]> {
  const since = new Date(runCreatedAt.getTime() - 5_000);
  const rows = await db
    .select({ sourceValue: schema.mappingRegistryEntry.sourceValue })
    .from(schema.mappingRegistryEntry)
    .where(
      and(
        eq(schema.mappingRegistryEntry.workspaceId, workspaceId),
        eq(schema.mappingRegistryEntry.status, "suggested"),
        eq(schema.mappingRegistryEntry.createdBy, "system"),
        gte(schema.mappingRegistryEntry.createdAt, since),
      ),
    );
  return unique(rows.map((r) => r.sourceValue));
}

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
