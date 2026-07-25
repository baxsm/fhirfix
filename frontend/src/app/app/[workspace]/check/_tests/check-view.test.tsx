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

  test("opens empty, not pre-filled with a sample", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByRole("heading", { name: /new check/i })).toBeInTheDocument();
    // the page used to mount with SAMPLES[0] already in the editor, so the empty
    // state was unreachable and "characters ready" described text nobody typed.
    expect(screen.getByPlaceholderText(/Paste a FHIR resource/i)).toHaveValue("");
    expect(screen.getByText(/nothing to check yet/i)).toBeInTheDocument();
  });

  test("run is disabled until there is something to run", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByRole("button", { name: /run check/i })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Paste a FHIR resource/i), {
      target: { value: '{"resourceType":"Patient"}' },
    });
    expect(screen.getByRole("button", { name: /run check/i })).toBeEnabled();
  });

  test("samples are offered in the empty state and load on click", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.click(screen.getByRole("button", { name: /US Core Patient/i }));
    expect(screen.getByPlaceholderText(/Paste a FHIR resource/i)).not.toHaveValue("");
    // once there is content the offer is gone; it is a way to start, not a picker
    // that stays on screen claiming the content belongs to it.
    expect(screen.queryByRole("button", { name: /HL7v2 ADT/i })).not.toBeInTheDocument();
  });

  test("paste and drop share one panel, with no mode switch", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    // the editor is always present - there is no mode in which it is swapped out,
    // and the one panel accepts both paste and drop.
    expect(screen.getByPlaceholderText(/drop a file anywhere on this panel/i)).toBeInTheDocument();
  });

  test("clear empties the editor and returns the empty state", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.change(screen.getByPlaceholderText(/Paste a FHIR resource/i), {
      target: { value: '{"resourceType":"Patient"}' },
    });
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(screen.getByPlaceholderText(/Paste a FHIR resource/i)).toHaveValue("");
    // the sample offer comes back, which is what empty looks like on this page.
    expect(screen.getByRole("button", { name: /US Core Patient/i })).toBeInTheDocument();
    expect(screen.getByText(/nothing to check yet/i)).toBeInTheDocument();
  });

  test("submitting routes to the new run report", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.change(screen.getByPlaceholderText(/Paste a FHIR resource/i), {
      target: { value: '{"resourceType":"Patient"}' },
    });
    fireEvent.click(screen.getByRole("button", { name: /run check/i }));
    expect(submitMutate).toHaveBeenCalledOnce();
    expect(routerPush).toHaveBeenCalledWith("/app/acme/runs/run_new");
  });
});
