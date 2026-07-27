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
const { notify } = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: { $store: { notify } } }));
let capturedOptions: { onSuccess?: (org: { slug: string }) => Promise<void> } | null = null;
vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    workspace: {
      create: {
        mutationOptions: (o: { onSuccess?: (org: { slug: string }) => Promise<void> }) => {
          capturedOptions = o;
          return o;
        },
      },
      list: { queryKey: () => ["workspace", "list"] },
    },
  }),
}));

import { CreateWorkspaceForm } from "../create-workspace-form";

describe("CreateWorkspaceForm", () => {
  beforeEach(() => {
    mutate.mockReset();
    push.mockReset();
    notify.mockReset();
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

  test("refreshes better-auth's org list after a create", async () => {
    const user = userEvent.setup();
    render(<CreateWorkspaceForm layout="page" />);
    await user.type(screen.getByLabelText(/workspace name/i), "Northwind Health");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    // the trpc mock captures mutationOptions, so this is the form's real onSuccess.
    expect(capturedOptions?.onSuccess).toBeDefined();
    await capturedOptions?.onSuccess?.({ slug: "northwind-health" });
    expect(notify).toHaveBeenCalledWith("$listOrg");
  });
});
