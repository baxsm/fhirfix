import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ComponentRow } from "../component-row";
import { StatusBanner } from "../status-banner";

describe("StatusBanner", () => {
  test("operational says so plainly", () => {
    render(<StatusBanner status="operational" />);
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
  });

  test("degraded says runs still complete, not that the product is down", () => {
    render(<StatusBanner status="degraded" />);
    expect(screen.getByText("Partial degradation")).toBeInTheDocument();
    expect(screen.getByText(/runs still complete/i)).toBeInTheDocument();
  });

  test("outage warns that runs may fail", () => {
    render(<StatusBanner status="outage" />);
    expect(screen.getByText("Service disruption")).toBeInTheDocument();
    expect(screen.getByText(/may fail or stay queued/i)).toBeInTheDocument();
  });

  // an unreachable health check must never render as green.
  test("unknown does not claim everything is fine", () => {
    render(<StatusBanner status="unknown" />);
    expect(screen.getByText("Status unavailable")).toBeInTheDocument();
    expect(screen.queryByText("All systems operational")).not.toBeInTheDocument();
  });
});

describe("ComponentRow", () => {
  test("renders the component name and its state", () => {
    render(<ComponentRow name="Validation engine" description="US Core" state="operational" />);
    expect(screen.getByText("Validation engine")).toBeInTheDocument();
    expect(screen.getByText("Operational")).toBeInTheDocument();
  });

  test("shows the failure detail when there is one", () => {
    render(
      <ComponentRow
        name="Format conversion"
        description="HL7 v2"
        state="outage"
        detail="not reporting healthy"
      />,
    );
    expect(screen.getByText("Outage")).toBeInTheDocument();
    expect(screen.getByText("not reporting healthy")).toBeInTheDocument();
  });

  test("omits the detail line when the state carries no extra information", () => {
    const { container } = render(
      <ComponentRow name="Run queue" description="Queued runs" state="operational" />,
    );
    expect(container.querySelector(".font-mono")).toBeNull();
  });
});
