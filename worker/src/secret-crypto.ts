import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";

// AES-256-GCM decrypt for webhook secrets. mirrors backend/src/lib/secret-crypto.
// the worker only ever DECRYPTS (to sign outbound deliveries); the backend does
// the encryption when a secret is created/rotated. both derive the 32-byte key
// from WEBHOOK_ENCRYPTION_KEY via sha256, so any env value length works.

const ALGO = "aes-256-gcm";

function key(): Buffer {
  return createHash("sha256").update(env.WEBHOOK_ENCRYPTION_KEY).digest();
}

export function decryptSecret(stored: string): string {
  const [ivHex, tagHex, ctHex] = stored.split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("malformed encrypted secret");
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString(
    "utf8",
  );
}

// exported for the test-ping path if the worker ever needs to mint one; primary
// encryption stays in the backend.
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ct.toString("hex")}`;
}
