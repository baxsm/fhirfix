import type { StatusTone } from "@/components/ui/status";

export type TargetType = "endpoint" | "source_url" | "upload_folder";
export type ChannelType = "email" | "slack" | "webhook";
export type DriftType =
  | "pass_rate_drop"
  | "new_error_class"
  | "unmapped_authority"
  | "ig_version_change";
export type DriftSeverity = "error" | "warning" | "info";

export interface ScheduledCheckRow {
  id: string;
  name: string;
  scheduleCron: string;
  scheduleLabel: string;
  targetType: TargetType;
  targetRef: string;
  profiles: string[];
  registryScope: string | null;
  baselineConfig: { minPassRate?: number; maxErrorDelta?: number } | null;
  enabled: boolean;
  lastRunId: string | null;
  lastRunAt: string | Date | null;
  lastError: string | null;
  channelTypes: string[];
  createdAt: string | Date;
}

export interface DriftAlertRow {
  id: string;
  scheduledCheckId: string;
  checkName: string | null;
  runId: string | null;
  type: DriftType;
  severity: DriftSeverity;
  metricBefore: string | null;
  metricAfter: string | null;
  detail: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | Date | null;
  createdAt: string | Date;
}

export const TARGET_LABELS: Record<TargetType, string> = {
  endpoint: "FHIR endpoint",
  source_url: "Source URL",
  upload_folder: "Latest upload",
};

export const DRIFT_LABELS: Record<DriftType, string> = {
  pass_rate_drop: "Conformance dropped",
  new_error_class: "New error class",
  unmapped_authority: "Unmapped authority",
  ig_version_change: "IG version changed",
};

export function severityTone(severity: DriftSeverity): StatusTone {
  if (severity === "error") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

export const CRON_PRESETS: { value: string; label: string }[] = [
  { value: "0 * * * *", label: "Every hour" },
  { value: "0 */6 * * *", label: "Every 6 hours" },
  { value: "0 3 * * *", label: "Daily at 03:00" },
  { value: "0 3 * * 1", label: "Weekly on Monday at 03:00" },
  { value: "0 3 1 * *", label: "Monthly on the 1st at 03:00" },
];
