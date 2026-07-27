import { SendMailClient } from "zeptomail";
import type { DetectedDrift } from "@shared/db/drift";
import { label } from "./drift-service";
import { env } from "./env";
import { logger } from "./lib";


let client: SendMailClient | null = null;

function getClient(): SendMailClient {
  if (!client) {
    client = new SendMailClient({ url: "api.zeptomail.com/", token: env.ZEPTOMAIL_TOKEN });
  }
  return client;
}

export let lastTestEmail: { to: string; subject: string; text: string } | null = null;
export function clearTestEmail(): void {
  lastTestEmail = null;
}

export async function sendAlertEmail(args: {
  to: string;
  checkName: string;
  runId: string;
  alerts: DetectedDrift[];
}): Promise<void> {
  const { to, checkName, runId, alerts } = args;
  const { subject, html, text } = driftEmail(checkName, runId, alerts);

  if (env.EMAIL_TEST_MODE || !env.ZEPTOMAIL_TOKEN) {
    logger.info("email.testMode", `to: ${to} | subject: ${subject}`);
    lastTestEmail = { to, subject, text };
    return;
  }

  await getClient().sendMail({
    from: { address: env.ZEPTOMAIL_FROM_ADDRESS, name: env.ZEPTOMAIL_FROM_NAME },
    to: [{ email_address: { address: to, name: to } }],
    subject,
    htmlbody: html,
    textbody: text,
  });
}

function driftEmail(checkName: string, runId: string, alerts: DetectedDrift[]) {
  const count = alerts.length;
  const subject = `${checkName}: ${count} conformance issue${count === 1 ? "" : "s"}`;
  const reportUrl = `${env.APP_URL}/app/runs/${runId}`;

  const rows = alerts
    .map(
      (a) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5"><strong>${escapeHtml(
          label(a.type),
        )}</strong><br><span style="color:#555">${escapeHtml(a.detail)}</span></td></tr>`,
    )
    .join("");

  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px">
<h2 style="margin:0 0 4px">${escapeHtml(checkName)}</h2>
<p style="color:#555;margin:0 0 16px">Your scheduled check found ${count} issue${count === 1 ? "" : "s"}.</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e5e5e5">${rows}</table>
<p style="margin:16px 0"><a href="${reportUrl}" style="background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">View the report</a></p>
</div>`;

  const text = [
    `${checkName}: ${count} issue${count === 1 ? "" : "s"}`,
    "",
    ...alerts.map((a) => `- ${label(a.type)}: ${a.detail}`),
    "",
    `View the report: ${reportUrl}`,
  ].join("\n");

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
