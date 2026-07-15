import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const saveMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: (opts: { onSuccess?: () => void }) => ({
    mutate: (vars: unknown) => {
      saveMutate(vars);
      opts.onSuccess?.();
    },
    isPending: false,
  }),
}));

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    billing: { setSpendCap: { mutationOptions: (o: unknown) => o } },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SpendCapForm } from "../spend-cap-form";

describe("SpendCapForm", () => {
  it("is explicit that a cap only notifies, it does not stop runs", () => {
    render(
      <SpendCapForm
        workspaceId="wsp_1"
        spendCap={{ monthlyCents: 10000, spentThisCycleCents: 2500 }}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText(/only sends an alert/i)).toBeInTheDocument();
    expect(screen.getByText(/will not cut off service/i)).toBeInTheDocument();
  });

  it("shows spend progress against the cap", () => {
    render(
      <SpendCapForm
        workspaceId="wsp_1"
        spendCap={{ monthlyCents: 10000, spentThisCycleCents: 2500 }}
        onSaved={vi.fn()}
      />,
    );
    // $25 of $100 = 25%.
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("clears the cap (null) when disabled", () => {
    saveMutate.mockReset();
    render(
      <SpendCapForm
        workspaceId="wsp_1"
        spendCap={{ monthlyCents: 10000, spentThisCycleCents: 0 }}
        onSaved={vi.fn()}
      />,
    );
    // uncheck "Set a monthly cap"
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(saveMutate).toHaveBeenCalledWith({ workspaceId: "wsp_1", monthlyCents: null });
  });
});
