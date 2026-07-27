import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export type ApiKeyMode = "test" | "live";

// how many prefix chars of the random part we keep for display masking.
const PREFIX_RANDOM_CHARS = 6;

export interface GeneratedKey {
  full: string; // shown once
  prefix: string; // stored + shown masked, e.g. "ffx_live_ab12cd"
  hash: string; // stored (HMAC-SHA256 hex)
}

export function hashKey(full: string): string {
  return createHmac("sha256", env.API_KEY_PEPPER).update(full).digest("hex");
}

export function generateKey(mode: ApiKeyMode): GeneratedKey {
  // base64url, no padding: 32 bytes -> 43 chars, all url-safe.
  const random = randomBytes(32).toString("base64url");
  const full = `ffx_${mode}_${random}`;
  const prefix = `ffx_${mode}_${random.slice(0, PREFIX_RANDOM_CHARS)}`;
  return { full, prefix, hash: hashKey(full) };
}

export function parseKeyMode(full: string): ApiKeyMode | null {
  if (full.startsWith("ffx_live_")) return "live";
  if (full.startsWith("ffx_test_")) return "test";
  return null;
}

export function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
