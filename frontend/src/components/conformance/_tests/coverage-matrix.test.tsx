import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CoverageMatrix } from "../coverage-matrix";
import type { MatrixCell, RegressionEntry } from "../types";

const cell = (over: Partial<MatrixCell> = {}): MatrixCell => ({
  requirementId: "ig@1",
  requirement: "SHALL support search",
  conformance: "SHALL",
  igIdentifier: "hl7.fhir.us.davinci-pdex-plan-net_1.1.0",
  testKit: "plan_net",
  result: "pass",
  testIds: ["t1"],
  ...over,
});

describe("CoverageMatrix", () => {
  it("shows an empty state when there is no coverage", () => {
    render(<CoverageMatrix cells={[]} regressions={[]} />);
    expect(screen.getByText("No coverage yet")).toBeInTheDocument();
  });

  it("renders the requirement text and its conformance level", () => {
    render(<CoverageMatrix cells={[cell()]} regressions={[]} />);
    expect(screen.getByText("SHALL support search")).toBeInTheDocument();
    expect(screen.getByText("SHALL")).toBeInTheDocument();
  });

  it("labels a result in text, not colour alone", () => {
    render(<CoverageMatrix cells={[cell({ result: "fail" })]} regressions={[]} />);
    expect(screen.getByText("Fail")).toBeInTheDocument();
  });

  it("calls an untested requirement not tested rather than passed", () => {
    render(<CoverageMatrix cells={[cell({ result: "skip", testIds: [] })]} regressions={[]} />);
    const row = screen.getByText("SHALL support search").closest("tr");
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain("Not tested");
    expect(row?.textContent).not.toContain("Pass");
  });

  it("shows the failure message from the run", () => {
    render(
      <CoverageMatrix
        cells={[cell({ result: "fail", message: "CapabilityStatement missing profile" })]}
        regressions={[]}
      />,
    );
    expect(screen.getByText("CapabilityStatement missing profile")).toBeInTheDocument();
  });

  it("filters down to failures", () => {
    const cells = [
      cell({ requirementId: "ig@1", result: "pass" }),
      cell({ requirementId: "ig@2", requirement: "SHALL paginate", result: "fail" }),
    ];
    render(<CoverageMatrix cells={cells} regressions={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Failed/ }));
    expect(screen.getByText("SHALL paginate")).toBeInTheDocument();
    expect(screen.queryByText("SHALL support search")).not.toBeInTheDocument();
  });

  it("tells the user when a filter hides everything", () => {
    render(<CoverageMatrix cells={[cell({ result: "pass" })]} regressions={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Failed/ }));
    expect(screen.getByText("Nothing matches this filter")).toBeInTheDocument();
  });

  it("marks a requirement that regressed since the previous run", () => {
    const regressions: RegressionEntry[] = [
      {
        requirementId: "ig@1",
        testKit: "plan_net",
        requirement: "SHALL support search",
        from: "pass",
        to: "fail",
        direction: "regressed",
      },
    ];
    render(<CoverageMatrix cells={[cell({ result: "fail" })]} regressions={regressions} />);
    expect(screen.getByText(/Regressed since/)).toBeInTheDocument();
  });

  it("marks a requirement that was fixed since the previous run", () => {
    const regressions: RegressionEntry[] = [
      {
        requirementId: "ig@1",
        testKit: "plan_net",
        requirement: "SHALL support search",
        from: "fail",
        to: "pass",
        direction: "fixed",
      },
    ];
    render(<CoverageMatrix cells={[cell()]} regressions={regressions} />);
    expect(screen.getByText(/Fixed since/)).toBeInTheDocument();
  });

  it("offers a kit filter only when more than one kit ran", () => {
    render(<CoverageMatrix cells={[cell()]} regressions={[]} />);
    expect(screen.queryByRole("button", { name: "All kits" })).not.toBeInTheDocument();

    render(
      <CoverageMatrix
        cells={[cell(), cell({ requirementId: "ig@9", testKit: "pdex" })]}
        regressions={[]}
      />,
    );
    expect(screen.getByRole("button", { name: "All kits" })).toBeInTheDocument();
  });
});
