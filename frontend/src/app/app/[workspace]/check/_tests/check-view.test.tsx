import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// drive the harness through its states by mocking the data layer. we control
// what the run query returns so each render path (idle, completed, failed) is
// exercised without a real backend.
const submitMutate = vi.fn();
let runData: unknown;

vi.mock("@/lib/auth-client", () => ({
  useListOrganizations: () => ({ data: [{ id: "wsp_1", slug: "acme", name: "Acme" }] }),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: submitMutate, isPending: false }),
  useQuery: () => ({ data: runData }),
}));

vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    run: {
      submit: { mutationOptions: (o: unknown) => o },
      get: { queryOptions: (o: unknown) => o },
    },
  }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CheckView } from "../check-view";

describe("CheckView", () => {
  beforeEach(() => {
    submitMutate.mockReset();
    runData = undefined;
  });

  test("renders the harness with samples loaded", () => {
    render(<CheckView workspace="acme" />);
    expect(screen.getByRole("heading", { name: /new check/i })).toBeInTheDocument();
    expect(screen.getByText(/US Core Patient/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run check/i })).toBeInTheDocument();
  });

  test("shows a completed run with before/after scores and findings", () => {
    runData = {
      run: {
        id: "run_1",
        status: "completed",
        conformanceScoreBefore: 880,
        conformanceScoreAfter: 970,
      },
      findings: [
        {
          id: "fnd_1",
          severity: "warning",
          category: "structural",
          ruleSource: "fhirfix.placeholder-system",
          fhirpath: "Patient.identifier[0].system",
          rawValidatorMessage: "placeholder system",
          plainMessage: "The identifier system was a placeholder.",
          suggestedFix: "Set the identifier system.",
          fixConfidence: "auto",
          fixStatus: "applied",
          occurrenceCount: 1,
        },
      ],
      corrected: '{"resourceType":"Patient"}',
    };
    render(<CheckView workspace="acme" />);
    expect(screen.getByText("880")).toBeInTheDocument();
    expect(screen.getByText("970")).toBeInTheDocument();
    expect(screen.getByText(/identifier system was a placeholder/i)).toBeInTheDocument();
    expect(screen.getByText(/applied/i)).toBeInTheDocument();
  });

  test("shows the failure state with the upstream detail", () => {
    runData = {
      run: { id: "run_2", status: "failed", errorMessage: "validator: unreachable" },
      findings: [],
      corrected: null,
    };
    render(<CheckView workspace="acme" />);
    expect(screen.getByText(/check failed/i)).toBeInTheDocument();
    expect(screen.getByText(/validator: unreachable/i)).toBeInTheDocument();
  });
});
