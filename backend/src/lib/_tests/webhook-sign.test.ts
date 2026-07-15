import { describe, expect, test } from "bun:test";
import { signPayload, verifySignature } from "@shared/db/webhooks";

// unit: HMAC signing round-trips and rejects tampering/replay. shared by the
// worker delivery path and the SDK verify helpers, so it must be exact.

describe("webhook signature", () => {
  const secret = "whsec_test_secret";
  const now = 1_700_000_000_000;

  test("a fresh signature verifies", () => {
    const { body, signature } = signPayload(secret, "run.completed", { runId: "run_x" }, now);
    expect(verifySignature(secret, signature, body, 300, now)).toBe(true);
  });

  test("a wrong secret fails", () => {
    const { body, signature } = signPayload(secret, "run.completed", { runId: "run_x" }, now);
    expect(verifySignature("whsec_other", signature, body, 300, now)).toBe(false);
  });

  test("a tampered body fails", () => {
    const { signature } = signPayload(secret, "run.completed", { runId: "run_x" }, now);
    expect(verifySignature(secret, signature, '{"event":"evil"}', 300, now)).toBe(false);
  });

  test("an expired timestamp fails (replay protection)", () => {
    const { body, signature } = signPayload(secret, "run.completed", { runId: "run_x" }, now);
    // 10 minutes later, tolerance 5 minutes -> rejected.
    expect(verifySignature(secret, signature, body, 300, now + 600_000)).toBe(false);
  });

  test("the signature header carries the t= timestamp and v1= hmac", () => {
    const { signature } = signPayload(secret, "run.failed", {}, now);
    expect(signature).toContain(`t=${now}`);
    expect(signature).toContain("v1=");
  });
});
