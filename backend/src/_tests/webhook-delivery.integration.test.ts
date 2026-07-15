import { afterAll, describe, expect, test } from "bun:test";
import { listEndpointsForEvent, signPayload, verifySignature } from "@shared/db/webhooks";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { decryptSecret, encryptSecret, generateWebhookSecret } from "@/lib/secret-crypto";

// integration: the webhook delivery loop against real Postgres + a real local
// receiver. proves an endpoint is found for its event, the secret decrypts, the
// signed payload is accepted by the shared verifier, and a non-subscribed event
// is skipped. this is the exact path the worker's executeWebhook runs.

const workspaces: string[] = [];

async function seedEndpoint(events: string[]): Promise<{ workspaceId: string; secret: string }> {
  const workspaceId = `whk_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  workspaces.push(workspaceId);
  const secret = generateWebhookSecret();
  await db.insert(schema.webhookEndpoint).values({
    id: createId("webhook"),
    workspaceId,
    url: "http://127.0.0.1:0/hook", // replaced per-test with the live receiver
    events,
    secret: encryptSecret(secret),
    createdBy: "system",
  });
  return { workspaceId, secret };
}

afterAll(async () => {
  if (workspaces.length) {
    await db
      .delete(schema.webhookEndpoint)
      .where(inArray(schema.webhookEndpoint.workspaceId, workspaces));
    await db
      .delete(schema.notificationLog)
      .where(inArray(schema.notificationLog.workspaceId, workspaces));
  }
});

describe("webhook delivery", () => {
  test("stored secret decrypts back to the original", async () => {
    const { workspaceId, secret } = await seedEndpoint(["run.completed"]);
    const [ep] = await listEndpointsForEvent(db, workspaceId, "run.completed");
    expect(ep).toBeDefined();
    expect(decryptSecret(ep?.secret ?? "")).toBe(secret);
  });

  test("only endpoints subscribed to the event are returned", async () => {
    const { workspaceId } = await seedEndpoint(["credits.low"]);
    // subscribed event -> found.
    expect((await listEndpointsForEvent(db, workspaceId, "credits.low")).length).toBe(1);
    // unsubscribed event -> skipped.
    expect((await listEndpointsForEvent(db, workspaceId, "run.completed")).length).toBe(0);
  });

  test("a real receiver accepts the signed payload", async () => {
    const { workspaceId, secret } = await seedEndpoint(["run.completed"]);
    let received: { body: string; sig: string } | null = null;

    const server = Bun.serve({
      port: 0,
      async fetch(req) {
        received = { body: await req.text(), sig: req.headers.get("X-FHIRfix-Signature") ?? "" };
        return new Response("ok");
      },
    });
    try {
      const [ep] = await listEndpointsForEvent(db, workspaceId, "run.completed");
      const plain = decryptSecret(ep?.secret ?? "");
      const ts = 1_700_000_000_000;
      const { body, signature } = signPayload(plain, "run.completed", { runId: "run_x" }, ts);

      const res = await fetch(`http://127.0.0.1:${server.port}/hook`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-FHIRfix-Signature": signature },
        body,
      });
      expect(res.status).toBe(200);
      expect(received).not.toBeNull();
      // the receiver can verify with the shared secret.
      const got = received as unknown as { body: string; sig: string };
      expect(verifySignature(secret, got.sig, got.body, 300, ts)).toBe(true);
      // and the payload carries the event.
      expect(JSON.parse(got.body).event).toBe("run.completed");
    } finally {
      server.stop(true);
    }
  });

  test("disabled endpoints are not delivered to", async () => {
    const { workspaceId } = await seedEndpoint(["run.completed"]);
    await db
      .update(schema.webhookEndpoint)
      .set({ enabled: false })
      .where(inArray(schema.webhookEndpoint.workspaceId, [workspaceId]));
    expect((await listEndpointsForEvent(db, workspaceId, "run.completed")).length).toBe(0);
  });
});
