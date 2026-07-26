import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// the ingestion page: one fixed panel that never changes shape, a permanent
// sample row, and a submit that routes to the report.
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

const editor = () => screen.getByPlaceholderText(/Paste FHIR JSON/i);

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
    expect(editor()).toHaveValue("");
    expect(screen.getByText(/nothing to check yet/i)).toBeInTheDocument();
  });

  test("run is disabled until there is something to run", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByRole("button", { name: /run check/i })).toBeDisabled();
    fireEvent.change(editor(), { target: { value: '{"resourceType":"Patient"}' } });
    expect(screen.getByRole("button", { name: /run check/i })).toBeEnabled();
  });

  // the regression test for the reported defect. the sample row used to render
  // only while the editor was empty, so clicking a sample unmounted the control
  // you just clicked and the panel resized by 413px under the pointer.
  test("sample chips stay mounted after one is chosen", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.click(screen.getByRole("button", { name: /US Core Patient/i }));

    expect(editor()).not.toHaveValue("");
    expect(screen.getByRole("button", { name: /US Core Patient/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /HL7v2 ADT/i })).toBeInTheDocument();
  });

  test("the chosen sample is marked, and choosing the other one swaps it", () => {
    render(<CheckView workspace="acme" />);
    const usCore = screen.getByRole("button", { name: /US Core Patient/i });
    fireEvent.click(usCore);
    expect(usCore).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /HL7v2 ADT/i }));
    expect(screen.getByRole("button", { name: /US Core Patient/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: /HL7v2 ADT/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("clicking the selected sample again empties the editor", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.click(screen.getByRole("button", { name: /US Core Patient/i }));
    fireEvent.click(screen.getByRole("button", { name: /US Core Patient/i }));
    expect(editor()).toHaveValue("");
    expect(screen.getByText(/nothing to check yet/i)).toBeInTheDocument();
  });

  test("paste and drop share one panel, with no mode switch", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(editor()).toBeInTheDocument();
  });

  test("reports the detected format rather than a bare character count", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.change(editor(), { target: { value: '{"resourceType":"Patient"}' } });
    expect(screen.getByText(/FHIR Patient/)).toBeInTheDocument();

    fireEvent.change(editor(), { target: { value: '{"resourceType":"Bundle","entry":[]}' } });
    expect(screen.getByText(/FHIR Bundle/)).toBeInTheDocument();

    fireEvent.change(editor(), { target: { value: "MSH|^~\\&|SENDER|" } });
    expect(screen.getByText(/HL7v2 message/)).toBeInTheDocument();

    fireEvent.change(editor(), { target: { value: "not json at all" } });
    expect(screen.getByText(/Unrecognised format/)).toBeInTheDocument();
  });

  test("clear empties the editor and returns the empty state", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.change(editor(), { target: { value: '{"resourceType":"Patient"}' } });
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(editor()).toHaveValue("");
    expect(screen.getByText(/nothing to check yet/i)).toBeInTheDocument();
  });

  test("submitting routes to the new run report", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.change(editor(), { target: { value: '{"resourceType":"Patient"}' } });
    fireEvent.click(screen.getByRole("button", { name: /run check/i }));
    expect(submitMutate).toHaveBeenCalledOnce();
    expect(routerPush).toHaveBeenCalledWith("/app/acme/runs/run_new");
  });
});
