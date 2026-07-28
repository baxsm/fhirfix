import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UsageChart } from "../usage-chart";

describe("UsageChart", () => {
  it("shows the empty state when there is no spend", () => {
    render(<UsageChart rows={[]} days={30} />);
    expect(screen.getByText(/No spend in the last/i)).toBeInTheDocument();
  });

  it("renders a chart when there is spend", () => {
    const rows = [
      { day: "2026-07-14", source: "ui", dollars: 0.03 },
      { day: "2026-07-15", source: "api", dollars: 0.02 },
    ];
    const { container } = render(<UsageChart rows={rows} days={30} />);
    // the empty state is gone; a recharts surface is present.
    expect(screen.queryByText(/No usage/i)).not.toBeInTheDocument();
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });

  it("renders the chart surface for a known source without erroring", () => {
    const rows = [{ day: "2026-07-15", source: "ui", dollars: 0.05 }];
    const { container } = render(<UsageChart rows={rows} days={30} />);
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
    expect(screen.queryByText(/No usage/i)).not.toBeInTheDocument();
  });
});
