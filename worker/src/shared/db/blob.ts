import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { storedObject } from "./schema/storage";

// blob store for phase-2 artifacts. every input/corrected object is tracked as a
// stored_object row; this reads and writes the bytes on that same row.
//
// why the database and not a disk: each service deploys as its own container with
// its own filesystem, so a path written by the backend does not exist for the
// worker. artifacts are json/text capped at 5MB by the upload guard, which is well
// inside what a text column holds. object-storage (S3/MinIO) can swap in later
// behind this same key-based interface.
export interface BlobStore {
  put(key: string, content: string, contentType: string): Promise<{ sha256: string; sizeBytes: number }>;
  get(key: string): Promise<string>;
}

export function createBlobStore(db: Db): BlobStore {
  return {
    async put(key, content, contentType) {
      const sha256 = createHash("sha256").update(content).digest("hex");
      const sizeBytes = Buffer.byteLength(content, "utf8");
      // this writes the bytes; the caller inserts the full stored_object row right
      // after (it owns bucket/kind/phi/retention). whichever lands first creates
      // the row, so both sides upsert and each only sets the columns it owns.
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
