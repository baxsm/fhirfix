import {
  detectDrift,
  loadPreviousRunId,
  loadSnapshot,
  persistDriftAlerts,
  type BaselineConfig,
  type DetectedDrift,
} from "@shared/db/drift";
import { recordNotification } from "@shared/db/notifications";
import { eq } from "drizzle-orm";
import { sendAlertEmail } from "./email";
import { db, driftAlertId, logger, schema } from "./lib";
import { dispatchWebhook } from "./queues";
import { decryptSecret } from "./secret-crypto";


const SLACK_TIMEOUT_MS = 10_000;

export async function evaluateDrift(args: {
  runId: string;
  workspaceId: string;
}): Promise<{ alerts: number }> {
  const { runId, workspaceId } = args;

  const [run] = await db
    .select({ actorType: schema.run.actorType, actorId: schema.run.actorId })
    .from(schema.run)
    .where(eq(schema.run.id, runId))
    .limit(1);

  // not a scheduled run: nothing to compare against a baseline.
  if (!run || run.actorType !== "scheduled" || !run.actorId) return { alerts: 0 };

  const [check] = await db
    .select({
      id: schema.scheduledCheck.id,
      name: schema.scheduledCheck.name,
      baselineConfig: schema.scheduledCheck.baselineConfig,
      alertChannels: schema.scheduledCheck.alertChannels,
    })
    .from(schema.scheduledCheck)
    .where(eq(schema.scheduledCheck.id, run.actorId))
    .limit(1);

  if (!check) return { alerts: 0 };

  const current = await loadSnapshot(db, runId);
  if (!current) return { alerts: 0 };

  const previousRunId = await loadPreviousRunId(db, check.id, runId);
  const previous = previousRunId ? await loadSnapshot(db, previousRunId) : null;

  const detected = detectDrift({
    current,
    previous,
    baseline: (check.baselineConfig as BaselineConfig | null) ?? null,
  });

  if (detected.length === 0) {
    logger.debug("drift.evaluate", `${runId}: no drift`);
    return { alerts: 0 };
  }

  const persisted = await persistDriftAlerts(db, {
    workspaceId,
    scheduledCheckId: check.id,
    runId,
    alerts: detected,
    makeId: driftAlertId,
  });

  logger.info("drift.evaluate", `${runId}: ${persisted.length} alert(s) on "${check.name}"`);

  await deliver({
    workspaceId,
    checkName: check.name,
    runId,
    channels: check.alertChannels ?? [],
    alerts: detected,
  });

  return { alerts: persisted.length };
}

async function deliver(args: {
  workspaceId: string;
  checkName: string;
  runId: string;
  channels: Array<{ type: "email" | "slack" | "webhook"; target: string }>;
  alerts: DetectedDrift[];
}): Promise<void> {
  const { workspaceId, checkName, runId, channels, alerts } = args;

  for (const channel of channels) {
    let target: string;
    try {
      target = decryptSecret(channel.target);
    } catch {
      target = channel.target;
    }

    try {
      if (channel.type === "email") {
        await sendAlertEmail({ to: target, checkName, runId, alerts });
      } else if (channel.type === "slack") {
        await postSlack(target, checkName, alerts);
      } else {
        await postJson(target, { event: "drift.detected", checkName, runId, alerts });
      }
      await recordNotification(db, {
        workspaceId,
        channel: channel.type,
        type: "drift.alert",
        target: redactTarget(target),
        status: "sent",
        metadata: { runId, alerts: alerts.length },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      logger.error("drift.deliver", `${channel.type} -> ${redactTarget(target)}: ${detail}`);
      await recordNotification(db, {
        workspaceId,
        channel: channel.type,
        type: "drift.alert",
        target: redactTarget(target),
        status: "failed",
        metadata: { runId, error: detail },
      });
    }
  }

  // the workspace-level outbound event, for endpoints subscribed to drift.detected.
  await dispatchWebhook({
    event: "drift.detected",
    workspaceId,
    data: {
      runId,
      checkName,
      alerts: alerts.map((a) => ({
        type: a.type,
        severity: a.severity,
        metricBefore: a.metricBefore,
        metricAfter: a.metricAfter,
        detail: a.detail,
      })),
    },
  }).catch((err) => logger.error("drift.webhook", String(err)));
}

async function postSlack(url: string, checkName: string, alerts: DetectedDrift[]): Promise<void> {
  const lines = alerts.map((a) => `• *${label(a.type)}* - ${a.detail}`).join("\n");
  await postJson(url, { text: `*${checkName}* found ${alerts.length} issue(s)\n${lines}` });
}

async function postJson(url: string, body: unknown): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SLACK_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

export function label(type: DetectedDrift["type"]): string {
  switch (type) {
    case "pass_rate_drop":
      return "Conformance dropped";
    case "new_error_class":
      return "New error class";
    case "unmapped_authority":
      return "Unmapped authority";
    case "ig_version_change":
      return "IG version changed";
  }
}

function redactTarget(target: string): string {
  if (!target.startsWith("http")) return target;
  try {
    const url = new URL(target);
    return `${url.origin}/...`;
  } catch {
    return "invalid-url";
  }
}
