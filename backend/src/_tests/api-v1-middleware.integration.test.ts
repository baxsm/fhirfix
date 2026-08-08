import { afterAll, describe, expect, test } from "bun:test";
import { grantTrialCredits } from "@shared/db/ledger";
import { eq, inArray } from "drizzle-orm";
import { generateKey, hashKey } from "@/lib/api-key";
import { db, schema } from "@/lib/db";
import { createId } from "@/lib/id";
import { apiV1 } from "@/routes/api-v1/index";

const workspaces: string[] = [];
const keyIds: string[] = [];

// insert a live api key for a workspace, return the full key + its workspace.
async function seedKey(fundCredits: boolean): Promise<{ full: string; workspaceId: string }> {
  const workspaceId = `apiv1_test_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  workspaces.push(workspaceId);
  if (fundCredits) await grantTrialCredits(db, workspaceId, "system");
  const { full, prefix, hash } = generateKey("test");
  const id = createId("apiKey");
  keyIds.push(id);
  await db.insert(schema.apiKey).values({
    id,
    workspaceId,
    name: "test key",
    prefix,
    hashedKey: hash,
    mode: "test",
    scopes: ["validate", "convert", "fix"],
    createdBy: "system",
  });
  return { full, workspaceId };
}

async function call(path: string, key?: string): Promise<Response> {
  return apiV1.request(path, {
    headers: key ? { authorization: `Bearer ${key}` } : {},
  });
}

async function rawLogCount(workspaceId: string): Promise<number> {
  const rows = await db
    .select({ id: schema.apiRequestLog.id })
    .from(schema.apiRequestLog)
    .where(eq(schema.apiRequestLog.workspaceId, workspaceId));
  return rows.length;
}

async function waitForLogs(workspaceId: string, atLeast: number): Promise<number> {
  for (let i = 0; i < 40; i++) {
    const n = await rawLogCount(workspaceId);
    if (n >= atLeast) return n;
    await new Promise((r) => setTimeout(r, 25));
  }
  return rawLogCount(workspaceId);
}

afterAll(async () => {
  if (keyIds.length) await db.delete(schema.apiKey).where(inArray(schema.apiKey.id, keyIds));
  if (workspaces.length) {
    await db
      .delete(schema.apiRequestLog)
      .where(inArray(schema.apiRequestLog.workspaceId, workspaces));
    await db
      .delete(schema.creditLedgerEntry)
      .where(inArray(schema.creditLedgerEntry.workspaceId, workspaces));
    await db
      .delete(schema.billingAccount)
      .where(inArray(schema.billingAccount.workspaceId, workspaces));
  }
  await db
    .delete(schema.apiRequestLog)
    .where(eq(schema.apiRequestLog.workspaceId, "unauthenticated"))
    .catch(() => {});
});

describe("api-v1 middleware chain", () => {
  test("401 with no key", async () => {
    const res = await call("/ping");
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("unauthorized");
  });

  test("401 with a malformed key", async () => {
    const res = await call("/ping", "sk_live_not_ours");
    expect(res.status).toBe(401);
  });

  test("401 with a well-formed but unknown key", async () => {
    const res = await call("/ping", generateKey("test").full);
    expect(res.status).toBe(401);
  });

  test("200 ping with a valid key, echoes workspace + scopes", async () => {
    const { full, workspaceId } = await seedKey(true);
    const res = await call("/ping", full);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.workspaceId).toBe(workspaceId);
    expect(body.mode).toBe("test");
    expect(body.scopes).toContain("validate");
    // a request log row landed for the successful call.
    expect(await waitForLogs(workspaceId, 1)).toBeGreaterThanOrEqual(1);
  });

  test("a revoked key fails auth", async () => {
    const { full } = await seedKey(true);
    await db
      .update(schema.apiKey)
      .set({ revokedAt: new Date() })
      .where(eq(schema.apiKey.hashedKey, hashKey(full)));
    const res = await call("/ping", full);
    expect(res.status).toBe(401);
  });

  test("402 when the workspace has no credits and no auto-recharge", async () => {
    const { full, workspaceId } = await seedKey(false); // no trial grant -> zero balance
    const res = await call("/ping-credits", full);
    expect(res.status).toBe(402);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("out_of_credits");
    // the 402 exit is still logged.
    expect(await waitForLogs(workspaceId, 1)).toBeGreaterThanOrEqual(1);
  });

  test("a funded workspace passes the credit gate", async () => {
    const { full } = await seedKey(true);
    const res = await call("/ping-credits", full);
    expect(res.status).toBe(200);
  });

  test("rate limit returns 429 + Retry-After after the window is exceeded", async () => {
    const { full } = await seedKey(true);
    // the window is 120/min; blow past it deterministically.
    let last: Response | undefined;
    for (let i = 0; i < 125; i++) last = await call("/ping", full);
    expect(last?.status).toBe(429);
    expect(last?.headers.get("Retry-After")).toBeTruthy();
    const body = (await last?.json()) as Record<string, unknown>;
    expect(body.error).toBe("rate_limited");
  });

  test("request log rows are written on both success and error exits", async () => {
    const { full, workspaceId } = await seedKey(true);
    await call("/ping", full); // 200
    await call("/nope", full); // 404 through the chain
    // both exits recorded against the workspace.
    expect(await waitForLogs(workspaceId, 2)).toBeGreaterThanOrEqual(2);
  });
});
