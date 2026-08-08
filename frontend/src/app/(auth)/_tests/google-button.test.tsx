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

  // the viewBox is google's own and is the tell if someone redraws the mark
  test("uses google's published mark, not a redraw", () => {
    const { container } = render(<GoogleButton />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 268.152 273.883");
  });

  // the gradient ids must stay prefixed or they collide with other inline svgs
  test("namespaces its gradient ids", () => {
    const { container } = render(<GoogleButton />);
    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.every((id) => id.startsWith("gg-"))).toBe(true);
  });
});
