import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mutate = vi.fn();
const push = vi.fn();
let isPending = false;

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate, isPending }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    workspace: {
      create: { mutationOptions: (o: unknown) => o },
      list: { queryKey: () => ["workspace", "list"] },
    },
  }),
}));

import { CreateWorkspaceForm } from "../create-workspace-form";

describe("CreateWorkspaceForm", () => {
  beforeEach(() => {
    mutate.mockReset();
    push.mockReset();
    isPending = false;
  });

  test("derives the slug from the name as you type", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm layout="page" />);
    await user.type(screen.getByLabelText(/workspace name/i), "Radiology QA");
    expect(screen.getByDisplayValue("radiology-qa")).toBeInTheDocument();
  });

  test("submit is disabled until a name is entered", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm layout="page" />);
    const button = screen.getByRole("button", { name: /create workspace/i });
    expect(button).toBeDisabled();
    await user.type(screen.getByLabelText(/workspace name/i), "Acme");
    expect(button).toBeEnabled();
  });

  test("submits name + derived slug", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm layout="page" />);
    await user.type(screen.getByLabelText(/workspace name/i), "Northwind Health");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));
    expect(mutate).toHaveBeenCalledWith({ name: "Northwind Health", slug: "northwind-health" });
  });

  test("modal layout renders a cancel button", () => {
    const onClose = vi.fn();
    render(<CreateWorkspaceForm layout="modal" onClose={onClose} />);
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});
