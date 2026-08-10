import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const replace = vi.fn();
const signOut = vi.fn(() => Promise.resolve());
let session: { user: { id: string } } | null = null;
let orgs: { slug: string }[] | null = null;
let sessionPending = false;
let orgsPending = false;

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/lib/auth-client", () => ({
  signOut: () => signOut(),
  useSession: () => ({ data: session, isPending: sessionPending }),
  useListOrganizations: () => ({ data: orgs, isPending: orgsPending }),
}));

import { AppEntry } from "../app-entry";

describe("AppEntry", () => {
  beforeEach(() => {
    replace.mockClear();
    signOut.mockClear();
    session = null;
    orgs = null;
    sessionPending = false;
    orgsPending = false;
  });

  test("signs out before leaving when the session is dead", async () => {
    // proxy.ts redirects on the cookie alone, so leaving without clearing it
    // sends the user straight back here and the two bounce forever
    render(<AppEntry />);
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in?signedout=1"));
  });

  test("still leaves for sign-in when the sign-out call fails", async () => {
    // the cookie survives a failed sign-out, so the flag is the only thing that
    // stops proxy.ts bouncing the user back here. without it this state is a
    // permanent lockout, escapable only by clearing cookies by hand.
    signOut.mockImplementationOnce(() => Promise.reject(new Error("network")));
    render(<AppEntry />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/sign-in?signedout=1"));
  });

  test("sends a signed-in user to their first workspace", async () => {
    session = { user: { id: "u1" } };
    orgs = [{ slug: "riverbend-clinical" }];
    render(<AppEntry />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app/riverbend-clinical"));
    expect(signOut).not.toHaveBeenCalled();
  });

  test("sends a signed-in user with no workspace to create one", async () => {
    session = { user: { id: "u1" } };
    orgs = [];
    render(<AppEntry />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/app/new"));
  });

  test("waits for both queries before deciding", () => {
    sessionPending = true;
    render(<AppEntry />);
    expect(replace).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  test("renders a visible waiting state, never a blank page", () => {
    sessionPending = true;
    const { container } = render(<AppEntry />);
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });
});
