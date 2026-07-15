import { describe, expect, test } from "bun:test";
import { generateKey, hashesEqual, hashKey, parseKeyMode } from "../api-key";
import { decryptSecret, encryptSecret, generateWebhookSecret } from "../secret-crypto";

describe("api key", () => {
  test("generates a mode-namespaced key with a masked prefix", () => {
    const live = generateKey("live");
    expect(live.full).toStartWith("ffx_live_");
    expect(live.prefix).toStartWith("ffx_live_");
    // prefix is a strict, shorter slice of the full key
    expect(live.full.startsWith(live.prefix)).toBe(true);
    expect(live.prefix.length).toBeLessThan(live.full.length);

    const test = generateKey("test");
    expect(test.full).toStartWith("ffx_test_");
  });

  test("the hash is deterministic and matches on verify", () => {
    const { full, hash } = generateKey("live");
    expect(hashKey(full)).toBe(hash);
    expect(hashesEqual(hashKey(full), hash)).toBe(true);
  });

  test("a different key never produces the same hash", () => {
    const a = generateKey("live");
    const b = generateKey("live");
    expect(a.full).not.toBe(b.full);
    expect(a.hash).not.toBe(b.hash);
  });

  test("parses mode without trusting the key, rejects malformed", () => {
    expect(parseKeyMode("ffx_live_abc")).toBe("live");
    expect(parseKeyMode("ffx_test_abc")).toBe("test");
    expect(parseKeyMode("sk_live_stripe")).toBeNull();
    expect(parseKeyMode("garbage")).toBeNull();
  });

  test("full key has real entropy (256-bit random part)", () => {
    const { full } = generateKey("live");
    const random = full.replace("ffx_live_", "");
    // 32 bytes base64url -> 43 chars
    expect(random.length).toBe(43);
  });
});

describe("webhook secret encryption", () => {
  test("round-trips through AES-256-GCM", () => {
    const secret = generateWebhookSecret();
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret);
    expect(enc.split(":").length).toBe(3); // iv:tag:ct
    expect(decryptSecret(enc)).toBe(secret);
  });

  test("each encryption uses a fresh iv (ciphertext differs)", () => {
    const secret = "whsec_fixed";
    expect(encryptSecret(secret)).not.toBe(encryptSecret(secret));
  });

  test("tampered ciphertext fails the auth tag", () => {
    const enc = encryptSecret("whsec_x");
    const [iv, tag, ct] = enc.split(":") as [string, string, string];
    const tampered = `${iv}:${tag}:${ct.slice(0, -2)}00`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  test("generated webhook secret is prefixed", () => {
    expect(generateWebhookSecret()).toStartWith("whsec_");
  });
});
