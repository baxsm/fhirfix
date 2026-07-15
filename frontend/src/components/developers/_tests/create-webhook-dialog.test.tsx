import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMutate = vi.fn();
// the response the mocked mutation replays through onSuccess. set per test to
// simulate the server returning the once-shown secret.
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
    developers: { webhooks: { create: { mutationOptions: (o: unknown) => o } } },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CreateWebhookDialog } from "../create-webhook-dialog";

function renderDialog() {
  return render(
    <CreateWebhookDialog workspaceId="wsp_1" open onOpenChange={vi.fn()} onCreated={vi.fn()} />,
  );
}

describe("CreateWebhookDialog", () => {
  beforeEach(() => {
    createMutate.mockReset();
    mutationResponse = null;
  });

  it("submits the url and default events", () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText(/endpoint url/i), {
      target: { value: "https://example.com/hook" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add endpoint/i }));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com/hook",
        events: ["run.completed", "run.failed"],
      }),
    );
  });

  it("blocks submit without a url", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /add endpoint/i }));
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("reveals the signing secret once on success", () => {
    mutationResponse = { secret: "whsec_xyz789" };
    renderDialog();
    fireEvent.change(screen.getByLabelText(/endpoint url/i), {
      target: { value: "https://example.com/hook" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add endpoint/i }));
    expect(screen.getByText("whsec_xyz789")).toBeInTheDocument();
    expect(screen.getByText(/shown once/i)).toBeInTheDocument();
  });
});
