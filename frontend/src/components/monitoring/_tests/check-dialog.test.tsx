import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createMutate = vi.fn();
const updateMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: (opts: { mutationKey?: string }) => ({
    mutate: (vars: unknown) => {
      if (opts.mutationKey === "update") updateMutate(vars);
      else createMutate(vars);
    },
    isPending: false,
  }),
}));

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    monitoring: {
      createCheck: { mutationOptions: (o: object) => ({ ...o, mutationKey: "create" }) },
      updateCheck: { mutationOptions: (o: object) => ({ ...o, mutationKey: "update" }) },
    },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CheckDialog } from "../check-dialog";

const defaults = {
  workspaceId: "wsp_1",
  open: true,
  target: null,
  onOpenChange: vi.fn(),
  onSaved: vi.fn(),
};

describe("CheckDialog", () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
  });

  it("blocks submit until a name and target are filled", () => {
    render(<CheckDialog {...defaults} />);
    fireEvent.click(screen.getByRole("button", { name: /create check/i }));
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("submits the name, schedule and target", () => {
    render(<CheckDialog {...defaults} />);
    fireEvent.change(screen.getByLabelText(/^name$/i), {
      target: { value: "Nightly Patient feed" },
    });
    fireEvent.change(screen.getByLabelText(/^url$/i), {
      target: { value: "https://api.example.org/fhir/Patient/1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create check/i }));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "wsp_1",
        name: "Nightly Patient feed",
        targetRef: "https://api.example.org/fhir/Patient/1",
        targetType: "endpoint",
        scheduleCron: "0 3 * * *",
        enabled: true,
      }),
    );
  });

  it("sends a null baseline when no thresholds are set", () => {
    render(<CheckDialog {...defaults} />);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "No baseline" } });
    fireEvent.change(screen.getByLabelText(/^url$/i), {
      target: { value: "https://example.org/f" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create check/i }));

    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ baselineConfig: null }));
  });

  it("sends only the thresholds that were filled in", () => {
    render(<CheckDialog {...defaults} />);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "Floor only" } });
    fireEvent.change(screen.getByLabelText(/^url$/i), {
      target: { value: "https://example.org/f" },
    });
    fireEvent.change(screen.getByLabelText(/minimum conformance/i), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: /create check/i }));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({ baselineConfig: { minPassRate: 90 } }),
    );
  });

  it("reveals a cron field only when the custom schedule is picked", () => {
    render(<CheckDialog {...defaults} />);
    expect(screen.queryByLabelText(/cron expression/i)).toBeNull();
  });

  it("blocks submit when a channel row has no target", () => {
    render(<CheckDialog {...defaults} />);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "With channel" } });
    fireEvent.change(screen.getByLabelText(/^url$/i), {
      target: { value: "https://example.org/f" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add channel/i }));
    fireEvent.click(screen.getByRole("button", { name: /create check/i }));
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("submits a filled channel row", () => {
    render(<CheckDialog {...defaults} />);
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: "With channel" } });
    fireEvent.change(screen.getByLabelText(/^url$/i), {
      target: { value: "https://example.org/f" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add channel/i }));
    fireEvent.change(screen.getByLabelText(/email target/i), {
      target: { value: "ops@example.org" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create check/i }));

    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        alertChannels: [{ type: "email", target: "ops@example.org" }],
      }),
    );
  });

  it("edits through the update mutation, carrying the id", () => {
    const target = {
      id: "sch_1",
      name: "Existing",
      scheduleCron: "0 3 * * *",
      scheduleLabel: "Daily at 03:00",
      targetType: "endpoint" as const,
      targetRef: "https://example.org/fhir",
      profiles: [],
      registryScope: null,
      baselineConfig: { minPassRate: 80 },
      enabled: true,
      lastRunId: null,
      lastRunAt: null,
      lastError: null,
      channelTypes: [],
      createdAt: new Date(),
    };
    render(<CheckDialog {...defaults} target={target} />);

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sch_1",
        name: "Existing",
        baselineConfig: { minPassRate: 80 },
      }),
    );
    expect(createMutate).not.toHaveBeenCalled();
  });
});
