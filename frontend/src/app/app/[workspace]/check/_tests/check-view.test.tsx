import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// the ingestion page: samples + drop zone + a submit that routes to the report.
const submitMutate = vi.fn();
const routerPush = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  useListOrganizations: () => ({ data: [{ id: "wsp_1", slug: "acme", name: "Acme" }] }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: (opts: { onSuccess?: (r: unknown) => void }) => ({
    mutate: (vars: unknown) => {
      submitMutate(vars);
      opts.onSuccess?.({ runId: "run_new", status: "queued" });
    },
    isPending: false,
  }),
}));

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    run: { submit: { mutationOptions: (o: unknown) => o } },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CheckView } from "../check-view";

describe("CheckView (ingestion)", () => {
  beforeEach(() => {
    submitMutate.mockReset();
    routerPush.mockReset();
  });

  test("renders the ingestion page with samples and a drop zone", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByRole("heading", { name: /new check/i })).toBeInTheDocument();
    expect(screen.getByText(/US Core Patient/i)).toBeInTheDocument();
    expect(screen.getByText(/Drop a file here/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run check/i })).toBeInTheDocument();
  });

  test("submitting routes to the new run report", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.click(screen.getByRole("button", { name: /run check/i }));
    expect(submitMutate).toHaveBeenCalledOnce();
    expect(routerPush).toHaveBeenCalledWith("/app/acme/runs/run_new");
  });

  test("run is disabled with empty content", () => {
    render(<CheckView workspace="acme" />);
    const textarea = screen.getByPlaceholderText(/Paste a FHIR resource/i);
    fireEvent.change(textarea, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /run check/i })).toBeDisabled();
  });
});
