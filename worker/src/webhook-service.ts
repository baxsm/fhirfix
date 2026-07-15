import {
  listEndpointsForEvent,
  recordDelivery,
  signPayload,
  type WebhookEvent,
} from "@shared/db/webhooks";
import { db, logger } from "./lib";
import type { WebhookJob } from "./queues";
import { decryptSecret } from "./secret-crypto";

// how long to wait on a receiver before treating the attempt as failed. keeps a
// slow endpoint from stalling the worker; BullMQ retries the whole job.
const DELIVERY_TIMEOUT_MS = 10_000;

// thrown so BullMQ marks the job failed and retries with backoff when ANY endpoint
// delivery failed. successful endpoints are already recorded, so a retry only
// re-hits the ones that need it? no - simplest correct behavior: a retry re-sends
// all subscribed endpoints. receivers must be idempotent (standard webhook rule),
// and we include the event id in the payload for dedup.
export class WebhookDeliveryError extends Error {}

export async function executeWebhook(job: WebhookJob): Promise<void> {
  const { event, workspaceId, data } = job;
  const endpoints = await listEndpointsForEvent(db, workspaceId, event as WebhookEvent);
  if (endpoints.length === 0) return; // nobody subscribed; nothing to do.

  const timestamp = Date.now();
  let anyFailed = false;

  for (const ep of endpoints) {
    let secret: string;
    try {
      secret = decryptSecret(ep.secret);
    } catch (err) {
      logger.error("webhook.decrypt", `${ep.id}: ${err instanceof Error ? err.message : String(err)}`);
      await recordDelivery(db, {
        workspaceId,
        endpointId: ep.id,
        url: ep.url,
        event: event as WebhookEvent,
        status: "failed",
        error: "secret decrypt failed",
      });
      anyFailed = true;
      continue;
    }

    const { body, signature } = signPayload(secret, event as WebhookEvent, data, timestamp);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
      const res = await fetch(ep.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-FHIRfix-Signature": signature },
        body,
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      const ok = res.status >= 200 && res.status < 300;
      await recordDelivery(db, {
        workspaceId,
        endpointId: ep.id,
        url: ep.url,
        event: event as WebhookEvent,
        status: ok ? "sent" : "failed",
        statusCode: res.status,
        error: ok ? undefined : `HTTP ${res.status}`,
      });
      if (!ok) anyFailed = true;
      logger.info("webhook.deliver", `${event} -> ${ep.url} [${res.status}]`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      await recordDelivery(db, {
        workspaceId,
        endpointId: ep.id,
        url: ep.url,
        event: event as WebhookEvent,
        status: "failed",
        error: detail,
      });
      anyFailed = true;
      logger.error("webhook.deliver", `${event} -> ${ep.url}: ${detail}`);
    }
  }

  // fail the job so BullMQ retries if any endpoint failed. successful ones re-send
  // on retry too (receivers must be idempotent - the payload carries the event ts).
  if (anyFailed) throw new WebhookDeliveryError(`${event}: one or more deliveries failed`);
}
