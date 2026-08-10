import { NextRequest } from "next/server";
import { describe, expect, test, vi } from "vitest";

const hasCookie = vi.fn();
vi.mock("better-auth/cookies", () => ({
  getSessionCookie: () => (hasCookie() ? "token" : null),
}));

import { proxy } from "../proxy";

function go(path: string, signedIn: boolean) {
  hasCookie.mockReturnValue(signedIn);
  const res = proxy(new NextRequest(`http://localhost:3000${path}`));
  return res.headers.get("location");
}

describe("proxy", () => {
  test("sends a signed-out visitor from the app to sign-in", () => {
    expect(go("/app", false)).toBe("http://localhost:3000/sign-in");
  });

  test("remembers where a signed-out visitor was headed", () => {
    expect(go("/app/acme/runs", false)).toBe(
      "http://localhost:3000/sign-in?next=%2Fapp%2Facme%2Fruns",
    );
  });

  test("sends a signed-in visitor from sign-in to the app", () => {
    expect(go("/sign-in", true)).toBe("http://localhost:3000/app");
  });

  // the cookie outlives the session row. without this the app sends the user to
  // sign-in, the proxy sends them back, and nothing but clearing cookies escapes
  test("lets a cookie holder stay on sign-in once the app says it signed them out", () => {
    expect(go("/sign-in?signedout=1", true)).toBeNull();
    expect(go("/sign-up?signedout=1", true)).toBeNull();
  });

  test("ignores the flag for a signed-out visitor", () => {
    expect(go("/sign-in?signedout=1", false)).toBeNull();
  });
});
