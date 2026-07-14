import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const setTheme = vi.fn();
let currentTheme = "dark";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: currentTheme, setTheme }),
}));

import { ThemeToggle } from "../theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockReset();
    currentTheme = "dark";
  });

  test("renders all three theme options", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /system/i })).toBeInTheDocument();
  });

  test("marks the active theme as pressed after mount", async () => {
    render(<ThemeToggle />);
    // mounted effect runs; dark is active.
    const dark = await screen.findByRole("button", { name: /dark/i });
    expect(dark).toHaveAttribute("aria-pressed", "true");
  });

  test("calls setTheme when a different option is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: /light/i }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
