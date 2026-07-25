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
    billing: { setAutoRecharge: { mutationOptions: (o: unknown) => o } },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AutoRechargeForm } from "../auto-recharge-form";

const packs = [
  { id: "pack_10", label: "$10", cents: 1000 },
  { id: "pack_25", label: "$25", cents: 2500 },
  { id: "pack_100", label: "$100", cents: 10000 },
];

describe("AutoRechargeForm", () => {
  it("does not show the cap-gotcha warning when not blocked", () => {
    render(
      <AutoRechargeForm
        workspaceId="wsp_1"
        autoRecharge={{
          enabled: true,
          thresholdDollars: 5,
          amountCents: 2500,
          blockedByCap: false,
        }}
        packs={packs}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByText(/spend cap is reached/i)).not.toBeInTheDocument();
  });

  it("surfaces the honest cap gotcha when a cap blocks the recharge", () => {
    render(
      <AutoRechargeForm
        workspaceId="wsp_1"
        autoRecharge={{ enabled: true, thresholdDollars: 5, amountCents: 2500, blockedByCap: true }}
        packs={packs}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText(/spend cap is reached/i)).toBeInTheDocument();
    expect(screen.getByText(/Runs will stop at/i)).toBeInTheDocument();
  });

  it("offers no save until something changes", () => {
    render(
      <AutoRechargeForm
        workspaceId="wsp_1"
        autoRecharge={{
          enabled: true,
          thresholdDollars: 5,
          amountCents: 2500,
          blockedByCap: false,
        }}
        packs={packs}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("submits the edited threshold", () => {
    saveMutate.mockReset();
    render(
      <AutoRechargeForm
        workspaceId="wsp_1"
        autoRecharge={{
          enabled: true,
          thresholdDollars: 5,
          amountCents: 2500,
          blockedByCap: false,
        }}
        packs={packs}
        onSaved={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(/when balance falls below/i), {
      target: { value: "12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(saveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: "wsp_1", enabled: true, thresholdDollars: 12 }),
    );
  });

  it("hides the settings entirely when switched off", () => {
    render(
      <AutoRechargeForm
        workspaceId="wsp_1"
        autoRecharge={{
          enabled: false,
          thresholdDollars: null,
          amountCents: null,
          blockedByCap: false,
        }}
        packs={packs}
        onSaved={vi.fn()}
      />,
    );
    // off means the fields are not there at all, rather than present-but-dead
    expect(screen.queryByLabelText(/when balance falls below/i)).not.toBeInTheDocument();
  });
});
