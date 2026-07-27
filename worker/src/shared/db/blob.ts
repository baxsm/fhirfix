import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { storedObject } from "./schema/storage";

export interface BlobStore {
  put(key: string, content: string, contentType: string): Promise<{ sha256: string; sizeBytes: number }>;
  get(key: string): Promise<string>;
}

export function createBlobStore(db: Db): BlobStore {
  return {
    async put(key, content, contentType) {
      const sha256 = createHash("sha256").update(content).digest("hex");
      const sizeBytes = Buffer.byteLength(content, "utf8");
      await db
        .insert(storedObject)
        .values({
          key,
          workspaceId: key.split("/")[0] ?? "",
          bucket: "db",
          kind: "input",
          sizeBytes,
          contentType,
          sha256,
          content,
          uploadState: "pending",
        })
        .onConflictDoUpdate({ target: storedObject.key, set: { content } });
      return { sha256, sizeBytes };
    },
    async get(key) {
      const [row] = await db
        .select({ content: storedObject.content })
        .from(storedObject)
        .where(eq(storedObject.key, key))
        .limit(1);
      if (!row?.content) throw new Error(`blob not found: ${key}`);
      return row.content;
    },
  };
}
