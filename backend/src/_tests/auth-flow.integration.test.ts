import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { auth } from "@/auth/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// integration: real Better Auth + real Postgres. requires docker postgres up
// and the schema pushed. runs against EMAIL_TEST_MODE so no real email is sent.
const testEmail = `itest-${Date.now()}@example.com`;
const testPassword = "integration-pass-123";

async function cleanup() {
  const [user] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, testEmail))
    .limit(1);
  if (user) {
    // members/sessions/accounts cascade on user delete via FKs.
    await db.delete(schema.user).where(eq(schema.user.id, user.id));
  }
}

beforeAll(cleanup);
afterAll(cleanup);

describe("auth flow", () => {
  test("sign-up creates an unverified user with a hashed password", async () => {
    await auth.api.signUpEmail({
      body: { email: testEmail, password: testPassword, name: "Integration Test" },
    });

    const [user] = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, testEmail))
      .limit(1);

    expect(user).toBeDefined();
    expect(user?.emailVerified).toBe(false);

    const [account] = await db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, user!.id))
      .limit(1);
    // password is stored hashed, never plaintext.
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toBe(testPassword);
  });

  test("sign-in is blocked until the email is verified", async () => {
    let blocked = false;
    try {
      await auth.api.signInEmail({ body: { email: testEmail, password: testPassword } });
    } catch {
      blocked = true;
    }
    expect(blocked).toBe(true);
  });

  test("verifying the email then signing in succeeds", async () => {
    // simulate the verify-link click by flipping the flag the token would set.
    await db
      .update(schema.user)
      .set({ emailVerified: true })
      .where(eq(schema.user.email, testEmail));

    const result = await auth.api.signInEmail({
      body: { email: testEmail, password: testPassword },
    });
    expect(result.user.email).toBe(testEmail);
    expect(result.token).toBeTruthy();
  });
});
