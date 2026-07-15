import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "./env";

// symmetric encryption for secrets that must be read back to use (webhook signing
// secrets). AES-256-GCM: authenticated, so tampering is detected on decrypt. the
// stored form is `iv:authTag:ciphertext`, all hex. the 32-byte key is derived from
// WEBHOOK_ENCRYPTION_KEY via sha256 so any length env value yields a valid key.

const ALGO = "aes-256-gcm";

function key(): Buffer {
  return createHash("sha256").update(env.WEBHOOK_ENCRYPTION_KEY).digest();
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const [ivHex, tagHex, ctHex] = stored.split(":");
  if (!ivHex || !tagHex || !ctHex) {
    throw new Error("malformed encrypted secret");
  }
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString(
    "utf8",
  );
}

// a fresh webhook signing secret shown once. whsec_ prefix mirrors the industry
// convention so it reads as a webhook secret in logs and config.
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}
