import { createHmac } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import { recordNotification } from "./notifications";
import * as schema from "./schema/index";


export type WebhookEvent =
  | "run.completed"
  | "run.failed"
  | "batch.completed"
  | "credits.low"
  | "drift.detected"
  | "conformance.completed";

// enabled endpoints in a workspace subscribed to a given event.
export async function listEndpointsForEvent(db: Db, workspaceId: string, event: WebhookEvent) {
  const rows = await db
    .select({
      id: schema.webhookEndpoint.id,
      url: schema.webhookEndpoint.url,
      secret: schema.webhookEndpoint.secret,
      events: schema.webhookEndpoint.events,
    })
    .from(schema.webhookEndpoint)
    .where(
      and(
        eq(schema.webhookEndpoint.workspaceId, workspaceId),
        eq(schema.webhookEndpoint.enabled, true),
      ),
    );
  return rows.filter((r) => r.events.includes(event));
}

export function signPayload(
  secret: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
  timestampMs: number,
): { body: string; signature: string } {
  const body = JSON.stringify({ event, data, timestamp: timestampMs });
  const signature = createHmac("sha256", secret)
    .update(`${timestampMs}.${body}`)
    .digest("hex");
  // t=<ts>,v1=<hmac> - the stripe/svix-style scheme so SDKs can verify uniformly.
  return { body, signature: `t=${timestampMs},v1=${signature}` };
}

export function verifySignature(
  secret: string,
  header: string,
  body: string,
  toleranceSeconds = 300,
  nowMs = Date.now(),
): boolean {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k ?? "", v ?? ""];
    }),
  );
  const ts = Number(parts.t);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowMs - ts) > toleranceSeconds * 1000) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  return parts.v1 === expected;
}

// record a delivery attempt + update the endpoint's latest status.
export async function recordDelivery(
  db: Db,
  args: {
    workspaceId: string;
    endpointId: string;
    url: string;
    event: WebhookEvent;
    status: "sent" | "failed";
    statusCode?: number;
    error?: string;
  },
): Promise<void> {
  await recordNotification(db, {
    workspaceId: args.workspaceId,
    channel: "webhook",
    type: args.event,
    target: args.url,
    status: args.status === "sent" ? "sent" : "failed",
    metadata: { endpointId: args.endpointId, statusCode: args.statusCode, error: args.error },
  });
  await db
    .update(schema.webhookEndpoint)
    .set({
      lastDeliveryStatus: args.status === "sent" ? `${args.statusCode ?? 200} ok` : (args.error ?? "failed"),
      lastDeliveryAt: new Date(),
    })
    .where(eq(schema.webhookEndpoint.id, args.endpointId));
}
