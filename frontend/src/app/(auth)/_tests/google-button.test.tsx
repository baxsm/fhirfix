import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

const social = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signIn: { social: (...args: unknown[]) => social(...args) },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { GoogleButton } from "../google-button";

describe("GoogleButton", () => {
  test("renders the provider button", () => {
    render(<GoogleButton />);
    expect(screen.getByRole("button", { name: /continue with google/i })).toBeInTheDocument();
  });

  // the mark is google's four brand colours and must not be tinted to ours
  test("keeps google's own mark colours", () => {
    const { container } = render(<GoogleButton />);
    const fills = [...container.querySelectorAll("path")].map((p) => p.getAttribute("fill"));
    expect(fills).toEqual(["#4285F4", "#34A853", "#FBBC05", "#EA4335"]);
  });
});
