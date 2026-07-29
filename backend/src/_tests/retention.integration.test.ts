import { afterAll, describe, expect, test } from "bun:test";
import { countExpiredBlobs, sweepExpiredBlobs } from "@shared/db/retention";
import { eq } from "drizzle-orm";
import { blobStore } from "@/lib/blob";
import { db, schema } from "@/lib/db";

const ws = `retention_test_${Date.now()}`;

afterAll(async () => {
  await db.delete(schema.storedObject).where(eq(schema.storedObject.workspaceId, ws));
});

async function seed(name: string, expiresAt: Date | null) {
  const key = `${ws}/${name}`;
  await blobStore.put(key, `payload-${name}`, "application/json");
  await db
    .update(schema.storedObject)
    .set({ workspaceId: ws, retentionExpiresAt: expiresAt })
    .where(eq(schema.storedObject.key, key));
  return key;
}

async function read(key: string) {
  const [row] = await db
    .select({ content: schema.storedObject.content, deletedAt: schema.storedObject.deletedAt })
    .from(schema.storedObject)
    .where(eq(schema.storedObject.key, key))
    .limit(1);
  return row;
}

describe("retention sweep", () => {
  test("purges expired bytes, keeps unexpired and unstamped ones", async () => {
    const expired = await seed("expired", new Date(Date.now() - 60_000));
    const fresh = await seed("fresh", new Date(Date.now() + 86_400_000));
    // no expiry set at all: must never be swept.
    const forever = await seed("forever", null);

    expect(await countExpiredBlobs(db)).toBeGreaterThanOrEqual(1);
    await sweepExpiredBlobs(db);

    const gone = await read(expired);
    expect(gone?.content).toBeNull();
    expect(gone?.deletedAt).not.toBeNull();

    expect((await read(fresh))?.content).not.toBeNull();
    expect((await read(forever))?.content).not.toBeNull();
  });

  test("a second sweep does not re-purge or double-count", async () => {
    const before = await sweepExpiredBlobs(db);
    const after = await sweepExpiredBlobs(db);
    expect(after.purged).toBe(0);
    expect(before.purged).toBeGreaterThanOrEqual(0);
  });

  test("the tracking row survives so disposal stays auditable", async () => {
    const rows = await db
      .select({ key: schema.storedObject.key })
      .from(schema.storedObject)
      .where(eq(schema.storedObject.workspaceId, ws));
    // three seeded, none deleted outright.
    expect(rows.length).toBe(3);
  });
});
