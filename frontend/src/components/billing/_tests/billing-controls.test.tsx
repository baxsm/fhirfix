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
    billing: {
      setAutoRecharge: { mutationOptions: (o: unknown) => o },
      setSpendCap: { mutationOptions: (o: unknown) => o },
    },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { BillingControls } from "../billing-controls";

const packs = [
  { id: "pack_10", label: "$10", cents: 1000 },
  { id: "pack_25", label: "$25", cents: 2500 },
  { id: "pack_100", label: "$100", cents: 10000 },
];

const defaults = {
  workspaceId: "wsp_1",
  packs,
  onSaved: vi.fn(),
  autoRecharge: {
    enabled: false,
    thresholdDollars: null,
    amountCents: null,
    blockedByCap: false,
  },
  spendCap: { monthlyCents: null },
};

describe("BillingControls", () => {
  it("says auto-recharge is not active, whether it is on or off", () => {
    const { rerender } = render(<BillingControls {...defaults} />);
    expect(screen.getByText(/charging is not connected yet/i)).toBeInTheDocument();

    rerender(
      <BillingControls
        {...defaults}
        autoRecharge={{
          ...defaults.autoRecharge,
          enabled: true,
          thresholdDollars: 5,
          amountCents: 2500,
        }}
      />,
    );
    expect(screen.getByText(/charging is not connected yet/i)).toBeInTheDocument();
  });

  it("reveals the recharge fields only when enabled", () => {
    render(<BillingControls {...defaults} />);
    expect(screen.queryByLabelText(/when balance falls below/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /auto-recharge/i }));
    expect(screen.getByLabelText(/when balance falls below/i)).toBeInTheDocument();
  });

  it("surfaces the cap gotcha when a cap blocks the recharge", () => {
    render(
      <BillingControls
        {...defaults}
        autoRecharge={{
          enabled: true,
          thresholdDollars: 5,
          amountCents: 2500,
          blockedByCap: true,
        }}
      />,
    );
    expect(screen.getByText(/spend cap is already reached/i)).toBeInTheDocument();
  });

  it("only offers save once something changed", () => {
    render(<BillingControls {...defaults} />);
    expect(screen.queryByRole("button", { name: /^save$/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /auto-recharge/i }));
    expect(screen.getAllByRole("button", { name: /^save$/i })).toHaveLength(1);
  });

  it("saves the spend alert as cents, and clears it when switched off", () => {
    saveMutate.mockReset();
    const { rerender } = render(
      <BillingControls {...defaults} spendCap={{ monthlyCents: null }} />,
    );
    fireEvent.click(screen.getByRole("switch", { name: /monthly spend alert/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(saveMutate).toHaveBeenCalledWith(expect.objectContaining({ monthlyCents: 10000 }));

    saveMutate.mockReset();
    rerender(<BillingControls {...defaults} spendCap={{ monthlyCents: 10000 }} />);
    fireEvent.click(screen.getByRole("switch", { name: /monthly spend alert/i }));
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    expect(saveMutate).toHaveBeenCalledWith(expect.objectContaining({ monthlyCents: null }));
  });

  it("describes the alert as a notice, not a limit that stops runs", () => {
    render(<BillingControls {...defaults} />);
    expect(screen.getByText(/does not stop runs/i)).toBeInTheDocument();
  });
});
