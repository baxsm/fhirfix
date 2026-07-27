import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMutate = vi.fn();
let mutationResponse: unknown = null;

vi.mock("@tanstack/react-query", () => ({
  useMutation: (opts: { onSuccess?: (res: unknown) => void }) => ({
    mutate: (vars: unknown) => {
      createMutate(vars);
      if (mutationResponse) opts.onSuccess?.(mutationResponse);
    },
    isPending: false,
  }),
}));

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    developers: { apiKeys: { create: { mutationOptions: (o: unknown) => o } } },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateKeyDialog } from "../create-key-dialog";

function renderDialog() {
  return render(
    <CreateKeyDialog workspaceId="wsp_1" open onOpenChange={vi.fn()} onCreated={vi.fn()} />,
  );
}

describe("CreateKeyDialog", () => {
  beforeEach(() => {
    createMutate.mockReset();
    mutationResponse = null;
  });

  it("defaults to test mode with the three core scopes", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "CI key" } });
    fireEvent.click(screen.getByRole("button", { name: /create key/i }));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "CI key",
        mode: "test",
        scopes: ["validate", "fix", "convert"],
      }),
    );
  });

  it("blocks submit without a name", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /create key/i }));
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("toggles a scope on and off", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "K" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /runs/i })); // add runs
    fireEvent.click(screen.getByRole("checkbox", { name: /fix/i })); // remove fix
    fireEvent.click(screen.getByRole("button", { name: /create key/i }));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: expect.arrayContaining(["validate", "convert", "runs"]),
      }),
    );
    expect(createMutate).not.toHaveBeenCalledWith(
      expect.objectContaining({ scopes: expect.arrayContaining(["fix"]) }),
    );
  });

  it("reveals the full key once on success and never re-shows the form", () => {
    mutationResponse = { key: "ffx_test_abc123", mode: "test" };
    renderDialog();
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "K" } });
    fireEvent.click(screen.getByRole("button", { name: /create key/i }));
    expect(screen.getByText("ffx_test_abc123")).toBeInTheDocument();
    expect(screen.getByText(/only time the full key is shown/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  });
});
