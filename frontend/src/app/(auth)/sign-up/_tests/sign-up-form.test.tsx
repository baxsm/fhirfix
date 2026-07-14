import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const signUpEmail = vi.fn();
const push = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { SignUpForm } from "../sign-up-form";

describe("SignUpForm", () => {
  beforeEach(() => {
    signUpEmail.mockReset();
    push.mockReset();
  });

  test("shows validation errors and does not submit an empty form", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();
    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  test("rejects a short password", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    await user.type(screen.getByLabelText(/name/i), "Ada");
    await user.type(screen.getByLabelText(/work email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(signUpEmail).not.toHaveBeenCalled();
  });

  test("submits valid input and routes to verify-email", async () => {
    signUpEmail.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<SignUpForm />);
    await user.type(screen.getByLabelText(/name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/work email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(signUpEmail).toHaveBeenCalledTimes(1));
    expect(signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "supersecret1",
      }),
    );
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith(expect.stringContaining("/verify-email")),
    );
  });

  test("surfaces a server error without navigating", async () => {
    signUpEmail.mockResolvedValue({ error: { message: "Email already in use" } });
    const user = userEvent.setup();
    render(<SignUpForm />);
    await user.type(screen.getByLabelText(/name/i), "Ada");
    await user.type(screen.getByLabelText(/work email/i), "ada@example.com");
    await user.type(screen.getByLabelText(/password/i), "supersecret1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(signUpEmail).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });
});
