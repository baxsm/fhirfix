import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// local filesystem blob store for phase-2 artifacts. every input/corrected object
// is tracked as a stored_object row; this writes the bytes. object-storage
// (S3/MinIO) swaps in later behind the same key-based interface.
export interface BlobStore {
  put(key: string, content: string, contentType: string): Promise<{ sha256: string; sizeBytes: number }>;
  get(key: string): Promise<string>;
}

export function createBlobStore(rootDir: string): BlobStore {
  const resolve = (key: string) => join(rootDir, key);
  return {
    async put(key, content, _contentType) {
      const path = resolve(key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, "utf8");
      const sha256 = createHash("sha256").update(content).digest("hex");
      return { sha256, sizeBytes: Buffer.byteLength(content, "utf8") };
    },
    async get(key) {
      return readFile(resolve(key), "utf8");
    },
  };
}
