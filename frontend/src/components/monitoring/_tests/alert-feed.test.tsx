import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ackMutate = vi.fn();
let queryState: { data?: unknown; isPending: boolean; isError: boolean } = {
  data: [],
  isPending: false,
  isError: false,
};
let lastQueryInput: unknown = null;

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ ...queryState, refetch: vi.fn() }),
  useMutation: () => ({ mutate: ackMutate, isPending: false }),
}));

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    monitoring: {
      listAlerts: {
        queryOptions: (input: unknown) => {
          lastQueryInput = input;
          return { queryKey: ["listAlerts", input] };
        },
      },
      acknowledgeAlert: { mutationOptions: (o: object) => o },
    },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { AlertFeed } from "../alert-feed";

const defaults = {
  workspace: "acme",
  workspaceId: "wsp_1",
  canManage: true,
  onChanged: vi.fn(),
};

const alert = {
  id: "drf_1",
  scheduledCheckId: "sch_1",
  checkName: "Nightly Patient feed",
  runId: "run_1",
  type: "pass_rate_drop" as const,
  severity: "error" as const,
  metricBefore: "99.0%",
  metricAfter: "61.0%",
  detail: "Conformance 61.0% is below the 90% floor.",
  acknowledgedBy: null,
  acknowledgedAt: null,
  createdAt: new Date(),
};

describe("AlertFeed", () => {
  beforeEach(() => {
    ackMutate.mockReset();
    queryState = { data: [], isPending: false, isError: false };
    lastQueryInput = null;
  });

  it("renders an alert with its label, detail and metric movement", () => {
    queryState = { data: [alert], isPending: false, isError: false };
    render(<AlertFeed {...defaults} />);

    expect(screen.getByText("Conformance dropped")).toBeDefined();
    expect(screen.getByText("Conformance 61.0% is below the 90% floor.")).toBeDefined();
    expect(screen.getByText(/99\.0% to 61\.0%/)).toBeDefined();
    expect(screen.getByText("Nightly Patient feed")).toBeDefined();
  });

  it("acknowledges an alert by id", () => {
    queryState = { data: [alert], isPending: false, isError: false };
    render(<AlertFeed {...defaults} />);

    fireEvent.click(screen.getByRole("button", { name: /^acknowledge$/i }));
    expect(ackMutate).toHaveBeenCalledWith({ workspaceId: "wsp_1", id: "drf_1" });
  });

  it("shows when an alert was already acknowledged instead of the button", () => {
    queryState = {
      data: [{ ...alert, acknowledgedBy: "usr_1", acknowledgedAt: new Date() }],
      isPending: false,
      isError: false,
    };
    render(<AlertFeed {...defaults} />);

    expect(screen.queryByRole("button", { name: /^acknowledge$/i })).toBeNull();
    expect(screen.getByText(/^Acknowledged /)).toBeDefined();
  });

  it("hides the acknowledge action from a role that cannot manage", () => {
    queryState = { data: [alert], isPending: false, isError: false };
    render(<AlertFeed {...defaults} canManage={false} />);
    expect(screen.queryByRole("button", { name: /^acknowledge$/i })).toBeNull();
  });

  it("defaults to unacknowledged only, and the filter drives the query", () => {
    render(<AlertFeed {...defaults} />);
    expect(lastQueryInput).toEqual({ workspaceId: "wsp_1", unacknowledgedOnly: true });

    fireEvent.click(screen.getByRole("button", { name: /unacknowledged only/i }));
    expect(lastQueryInput).toEqual({ workspaceId: "wsp_1", unacknowledgedOnly: false });
  });

  it("shows the all-clear empty state when filtering to open alerts", () => {
    render(<AlertFeed {...defaults} />);
    expect(screen.getByText("Nothing needs attention")).toBeDefined();
  });

  it("distinguishes an error from an empty list", () => {
    queryState = { data: undefined, isPending: false, isError: true };
    render(<AlertFeed {...defaults} />);

    expect(screen.getByText(/could not load drift alerts/i)).toBeDefined();
    expect(screen.queryByText("Nothing needs attention")).toBeNull();
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
  });
});
