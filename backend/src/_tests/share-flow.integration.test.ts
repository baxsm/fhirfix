import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { auth } from "@/auth/auth";
import { blobKey, blobStore } from "@/lib/blob";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { appRouter } from "@/trpc/routers/index";
import { createCallerFactory } from "@/trpc/trpc";

// integration: the share router must BLOCK a public link for a run whose corrected
// artifact still holds un-redacted PHI, and allow a redacted copy. real Postgres +
// real Better Auth session + real blob store.
const email = `stest-${Date.now()}@example.com`;
const password = "share-pass-123";
let headers: Headers;

const createCaller = createCallerFactory(appRouter);

const PHI_PATIENT = {
  resourceType: "Patient",
  identifier: [{ system: "http://x/mrn", value: "10009" }],
  name: [{ family: "Esterkin", given: ["AKI"] }],
  gender: "female",
};

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
  await auth.api.signUpEmail({ body: { email, password, name: "Share Test" } });
  await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.email, email));
  const signIn = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
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

describe("share flow", () => {
  let workspaceId: string;
  let runId: string;

  test("setup: a completed run with a PHI corrected artifact", async () => {
    const caller = await callerFor();
    const org = await caller.workspace.create({ name: "Share WS", slug: `share-ws-${Date.now()}` });
    workspaceId = org.id;
    runId = createId("run");

    const key = blobKey(workspaceId, runId, "corrected");
    await blobStore.put(key, JSON.stringify(PHI_PATIENT), "application/json");
    await db.insert(schema.run).values({
      id: runId,
      workspaceId,
      actorType: "user",
      source: "ui",
      inputType: "fhir_json",
      engineVersion: "test",
      status: "completed",
      correctedRef: key,
      conformanceScoreBefore: 880,
      conformanceScoreAfter: 970,
    });
    expect(runId).toContain("run_");
  });

  test("blocks a share link for an un-redacted PHI run", async () => {
    const caller = await callerFor();
    let message = "";
    try {
      await caller.run.share({ workspaceId, runId, redact: false });
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toMatch(/patient identifiers|redacted/i);
  });

  test("allows a redacted share and marks it redacted", async () => {
    const caller = await callerFor();
    const res = await caller.run.share({ workspaceId, runId, redact: true });
    expect(res.token).toContain("shr_");
    expect(res.redacted).toBe(true);
  });

  test("revoke marks the share revoked", async () => {
    const caller = await callerFor();
    const res = await caller.run.share({ workspaceId, runId, redact: true });
    const revoked = await caller.run.revokeShare({ workspaceId, token: res.token });
    expect(revoked.revoked).toBe(true);
    const [row] = await db
      .select({ revokedAt: schema.reportShare.revokedAt })
      .from(schema.reportShare)
      .where(eq(schema.reportShare.token, res.token))
      .limit(1);
    expect(row?.revokedAt).not.toBeNull();
  });
});
