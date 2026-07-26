import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// the ingestion page: ONE framed editor. the header gets content in (upload,
// load a sample), the footer acts on it (clear, run). every control is mounted
// at all times, so using the page never changes which controls it has.
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
const controlNames = () =>
  screen
    .getAllByRole("button")
    .map((b) => b.textContent?.trim())
    .filter(Boolean);

describe("CheckView (ingestion)", () => {
  beforeEach(() => {
    submitMutate.mockReset();
    routerPush.mockReset();
  });

  test("opens empty, not pre-filled with a sample", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByRole("heading", { name: /new check/i })).toBeInTheDocument();
    expect(editor()).toHaveValue("");
    expect(screen.getByText(/nothing to check yet/i)).toBeInTheDocument();
  });

  // run is the page's purpose, so it is always there and merely disabled. clear
  // is conditional on there being something to clear, so it is absent - a ghost
  // "Clear" over an empty editor is noise. it sits between the fixed status line
  // and the fixed Run button, so arriving moves neither.
  test("run is always present; clear only exists once there is content", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByRole("button", { name: /run check/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^clear$/i })).not.toBeInTheDocument();

    fireEvent.change(editor(), { target: { value: '{"resourceType":"Patient"}' } });
    expect(screen.getByRole("button", { name: /run check/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /^clear$/i })).toBeEnabled();
  });

  // the reported defect: the ways of GETTING content in must never come and go,
  // or acting on the page changes which controls the page has.
  test("the source controls are identical empty and filled", () => {
    render(<CheckView workspace="acme" />);
    const before = controlNames().filter((n) => n !== "Clear");
    fireEvent.change(editor(), { target: { value: '{"resourceType":"Patient"}' } });
    expect(controlNames().filter((n) => n !== "Clear")).toEqual(before);
  });

  test("getting content in lives in the header, acting on it in the footer", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByRole("button", { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /load a sample/i })).toBeInTheDocument();
  });

  // a sample is an action, not a mode. nothing stays selected, so nothing can
  // contradict the editor once it is edited.
  test("the sample menu leaves no selected state behind", () => {
    render(<CheckView workspace="acme" />);
    const trigger = screen.getByRole("button", { name: /load a sample/i });
    expect(trigger).not.toHaveAttribute("aria-pressed");
    expect(screen.queryByRole("button", { pressed: true })).not.toBeInTheDocument();
  });

  test("there is no mode switch on the page", () => {
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

  test("tab indents instead of leaving the editor", () => {
    render(<CheckView workspace="acme" />);
    const box = editor();
    fireEvent.change(box, { target: { value: "{}" } });
    (box as HTMLTextAreaElement).setSelectionRange(1, 1);
    fireEvent.keyDown(box, { key: "Tab" });
    expect(box).toHaveValue("{  }");
  });

  test("the profile line holds its place when there is no problem to report", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByText(/validated against US Core 6\.1\.0/i)).toBeInTheDocument();
  });

  test("submitting routes to the new run report", () => {
    render(<CheckView workspace="acme" />);
    fireEvent.change(editor(), { target: { value: '{"resourceType":"Patient"}' } });
    fireEvent.click(screen.getByRole("button", { name: /run check/i }));
    expect(submitMutate).toHaveBeenCalledOnce();
    expect(routerPush).toHaveBeenCalledWith("/app/acme/runs/run_new");
  });
});
