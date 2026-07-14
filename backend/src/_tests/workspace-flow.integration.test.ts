import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { auth } from "@/auth/auth";
import { db, schema } from "@/lib/db";
import { appRouter } from "@/trpc/routers/index";
import { createCallerFactory } from "@/trpc/trpc";

// integration: exercises the tRPC workspace/member routers with a real signed-in
// session against real Postgres + Better Auth.
const email = `wtest-${Date.now()}@example.com`;
const password = "workspace-pass-123";
let headers: Headers;
let userId: string;

const createCaller = createCallerFactory(appRouter);

async function cleanup() {
  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  if (user) await db.delete(schema.user).where(eq(schema.user.id, user.id));
}

beforeAll(async () => {
  await cleanup();
  await auth.api.signUpEmail({ body: { email, password, name: "Workspace Test" } });
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.email, email));

  const signIn = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  userId = signIn.response.user.id;
  // reuse the set-cookie so the caller context resolves this session.
  const setCookie = signIn.headers.get("set-cookie") ?? "";
  headers = new Headers({ cookie: setCookie.split(";")[0] ?? "" });
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

describe("workspace flow", () => {
  let workspaceId: string;

  test("create seeds a workspace_settings row and makes creator owner", async () => {
    const caller = await callerFor();
    const org = await caller.workspace.create({ name: "Test WS", slug: `test-ws-${Date.now()}` });
    workspaceId = org.id;

    const [settings] = await db
      .select()
      .from(schema.workspaceSettings)
      .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
      .limit(1);
    expect(settings).toBeDefined();
    expect(settings?.redactionPolicy).toBe("on_ingest");

    const [member] = await db
      .select()
      .from(schema.member)
      .where(eq(schema.member.userId, userId))
      .limit(1);
    expect(member?.role).toBe("owner");
  });

  test("owner can list members", async () => {
    const caller = await callerFor();
    const result = await caller.member.list({ workspaceId });
    expect(result.members.length).toBeGreaterThanOrEqual(1);
  });

  test("owner can update workspace defaults", async () => {
    const caller = await callerFor();
    const updated = await caller.workspace.updateSettings({
      workspaceId,
      dataRetentionDays: 90,
    });
    expect(updated.dataRetentionDays).toBe(90);
  });

  test("a non-member is denied access to the workspace", async () => {
    // caller with a null session cannot pass the workspace membership check.
    const anonCaller = createCaller({ db, headers: new Headers(), session: null, user: null });
    let denied = false;
    try {
      await anonCaller.member.list({ workspaceId });
    } catch {
      denied = true;
    }
    expect(denied).toBe(true);
  });
});
