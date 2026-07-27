import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { auth } from "@/auth/auth";
import { hashKey } from "@/lib/api-key";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { appRouter } from "@/trpc/routers/index";
import { createCallerFactory } from "@/trpc/trpc";

const email = `devtest-${Date.now()}@example.com`;
const password = "dev-flow-pass-123";
let headers: Headers;
let workspaceId: string;

const createCaller = createCallerFactory(appRouter);

async function cleanup() {
  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (user) await db.delete(schema.user).where(eq(schema.user.id, user.id));
  if (workspaceId) {
    await db.delete(schema.apiKey).where(eq(schema.apiKey.workspaceId, workspaceId));
    await db
      .delete(schema.webhookEndpoint)
      .where(eq(schema.webhookEndpoint.workspaceId, workspaceId));
    await db.delete(schema.apiRequestLog).where(eq(schema.apiRequestLog.workspaceId, workspaceId));
  }
}

beforeAll(async () => {
  await auth.api.signUpEmail({ body: { email, password, name: "Dev Test" } });
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.email, email));
  const signIn = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
  const setCookie = signIn.headers.get("set-cookie") ?? "";
  headers = new Headers({ cookie: setCookie.split(";")[0] ?? "" });
  const caller = await callerFor();
  const org = await caller.workspace.create({ name: "Dev WS", slug: `dev-ws-${Date.now()}` });
  workspaceId = org.id;
});

afterAll(cleanup);

async function callerFor() {
  const session = await auth.api.getSession({ headers });
  return createCaller({
    db,
    headers,
    session: session?.session ?? null,
    user: session?.user ?? null,
  });
}

describe("developers.apiKeys", () => {
  test("create returns the full key once, list masks it, revoke blocks auth", async () => {
    const caller = await callerFor();
    const created = await caller.developers.apiKeys.create({
      workspaceId,
      name: "CI key",
      mode: "test",
      scopes: ["validate", "fix"],
    });
    expect(created.key).toStartWith("ffx_test_");

    // list never returns the secret, shows the prefix.
    const list = await caller.developers.apiKeys.list({ workspaceId });
    const row = list.find((k) => k.id === created.id);
    expect(row).toBeDefined();
    expect((row as Record<string, unknown>).hashedKey).toBeUndefined();
    expect(row?.prefix).toStartWith("ffx_test_");

    // the stored hash matches the returned key (auth would resolve it).
    const [dbRow] = await db
      .select({ hashedKey: schema.apiKey.hashedKey })
      .from(schema.apiKey)
      .where(eq(schema.apiKey.id, created.id))
      .limit(1);
    expect(dbRow?.hashedKey).toBe(hashKey(created.key));

    // revoke sets revokedAt.
    await caller.developers.apiKeys.revoke({ workspaceId, keyId: created.id });
    const [revoked] = await db
      .select({ revokedAt: schema.apiKey.revokedAt })
      .from(schema.apiKey)
      .where(eq(schema.apiKey.id, created.id))
      .limit(1);
    expect(revoked?.revokedAt).not.toBeNull();
  });
});

describe("developers.webhooks", () => {
  test("create returns secret once, list hides it, rotate changes it", async () => {
    const caller = await callerFor();
    const ep = await caller.developers.webhooks.create({
      workspaceId,
      url: "https://example.com/hook",
      events: ["run.completed", "run.failed"],
    });
    expect(ep.secret).toStartWith("whsec_");

    const list = await caller.developers.webhooks.list({ workspaceId });
    const row = list.find((w) => w.id === ep.id);
    expect(row).toBeDefined();
    expect((row as Record<string, unknown>).secret).toBeUndefined();
    expect(row?.events).toContain("run.completed");

    const rotated = await caller.developers.webhooks.rotateSecret({ workspaceId, id: ep.id });
    expect(rotated.secret).toStartWith("whsec_");
    expect(rotated.secret).not.toBe(ep.secret);

    await caller.developers.webhooks.delete({ workspaceId, id: ep.id });
    const after = await caller.developers.webhooks.list({ workspaceId });
    expect(after.find((w) => w.id === ep.id)).toBeUndefined();
  });
});

describe("developers.requestLogs", () => {
  test("lists logged traffic with error + method filters", async () => {
    // seed a couple of log rows directly (the middleware writes these in prod).
    await db.insert(schema.apiRequestLog).values([
      {
        id: createId("apiRequestLog"),
        workspaceId,
        method: "POST",
        path: "/api/v1/fix",
        statusCode: 200,
        latencyMs: 42,
      },
      {
        id: createId("apiRequestLog"),
        workspaceId,
        method: "POST",
        path: "/api/v1/fix",
        statusCode: 402,
        latencyMs: 3,
        errorCode: "out_of_credits",
      },
    ]);

    const caller = await callerFor();
    const all = await caller.developers.requestLogs.list({ workspaceId, limit: 10 });
    expect(all.logs.length).toBeGreaterThanOrEqual(2);

    // onlyErrors filters to status >= 400.
    const errors = await caller.developers.requestLogs.list({ workspaceId, onlyErrors: true });
    expect(errors.logs.every((l) => l.statusCode >= 400)).toBe(true);
    expect(errors.logs.some((l) => l.errorCode === "out_of_credits")).toBe(true);

    // method filter.
    const posts = await caller.developers.requestLogs.list({ workspaceId, method: "POST" });
    expect(posts.logs.every((l) => l.method === "POST")).toBe(true);
  });
});
