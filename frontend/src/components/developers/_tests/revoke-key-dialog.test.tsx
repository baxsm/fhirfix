import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const revokeMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: (opts: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      revokeMutate(vars);
      opts.onSuccess?.();
    },
    isPending: false,
  }),
}));

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    developers: { apiKeys: { revoke: { mutationOptions: (o: unknown) => o } } },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { RevokeKeyDialog } from "../revoke-key-dialog";

describe("RevokeKeyDialog", () => {
  beforeEach(() => revokeMutate.mockReset());

  it("names the key and its 401 consequence", () => {
    render(
      <RevokeKeyDialog
        workspaceId="wsp_1"
        target={{ id: "key_1", name: "CI key", prefix: "ffx_test_abc" }}
        onOpenChange={vi.fn()}
        onRevoked={vi.fn()}
      />,
    );
    expect(screen.getByText("CI key")).toBeInTheDocument();
    expect(screen.getByText(/401/)).toBeInTheDocument();
  });

  it("revokes by key id on confirm", () => {
    render(
      <RevokeKeyDialog
        workspaceId="wsp_1"
        target={{ id: "key_1", name: "CI key", prefix: "ffx_test_abc" }}
        onOpenChange={vi.fn()}
        onRevoked={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /revoke key/i }));
    expect(revokeMutate).toHaveBeenCalledWith({ workspaceId: "wsp_1", keyId: "key_1" });
  });

  it("renders nothing when there is no target", () => {
    const { container } = render(
      <RevokeKeyDialog
        workspaceId="wsp_1"
        target={null}
        onOpenChange={vi.fn()}
        onRevoked={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
