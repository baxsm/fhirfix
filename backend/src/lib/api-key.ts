import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// public REST API keys. format: ffx_<mode>_<43-char base64url random> (256 bits
// of entropy). the full key is returned once at creation; we persist only the
// keyed hash. a 256-bit random secret is not brute-forcible, so a fast keyed hash
// (HMAC-SHA256 with a server-side pepper) is the right tool - argon2 is for
// low-entropy passwords and would add per-request latency for no gain. the keyed
// hash is deterministic, so auth looks up the key by an index on hashed_key.

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

// parse the mode out of a presented key without trusting it. returns null for a
// malformed key so the caller can 401 before any db work.
export function parseKeyMode(full: string): ApiKeyMode | null {
  if (full.startsWith("ffx_live_")) return "live";
  if (full.startsWith("ffx_test_")) return "test";
  return null;
}

// constant-time compare of two hex hashes. the indexed lookup already does the
// match, but this guards any place that compares a stored hash to a computed one.
export function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
