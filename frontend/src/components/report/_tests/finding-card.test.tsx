import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FindingCard } from "../finding-card";
import type { FindingRow } from "../report-types";

function mk(overrides: Partial<FindingRow>): FindingRow {
  return {
    id: "fnd_1",
    severity: "warning",
    category: "terminology",
    ruleSource: "Terminology_TX",
    specCitation: "us-core-patient",
    resourceType: "Patient",
    fhirpath: "Patient.identifier[0].type.coding[0]",
    rawValidatorMessage: "raw validator text",
    plainMessage: "A code with no system.",
    suggestedFix: "Set the v2-0203 system.",
    fixConfidence: "auto",
    fixStatus: "suggested",
    dedupFingerprint: "fp1",
    occurrenceCount: 3,
    rank: 210,
    ...overrides,
  };
}

describe("FindingCard", () => {
  it("shows the plain message, path, and occurrence count", () => {
    render(<FindingCard finding={mk({})} before={null} after={null} busy={false} />);
    expect(screen.getByText("A code with no system.")).toBeInTheDocument();
    expect(screen.getByText("Patient.identifier[0].type.coding[0]")).toBeInTheDocument();
    expect(screen.getByText("×3")).toBeInTheDocument();
  });

  it("offers Apply + Dismiss for a suggested fix and fires them", () => {
    const onApply = vi.fn();
    const onDismiss = vi.fn();
    render(
      <FindingCard
        finding={mk({})}
        before={null}
        after={null}
        busy={false}
        onApply={onApply}
        onDismiss={onDismiss}
      />,
    );
    // expand the card.
    fireEvent.click(screen.getByText("A code with no system."));
    fireEvent.click(screen.getByText("Apply fix"));
    expect(onApply).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Dismiss"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("offers Fix with AI for a manual finding, not Apply", () => {
    const onAi = vi.fn();
    render(
      <FindingCard
        finding={mk({ fixStatus: "manual_needed", fixConfidence: "manual" })}
        before={null}
        after={null}
        busy={false}
        onFixWithAi={onAi}
      />,
    );
    fireEvent.click(screen.getByText("A code with no system."));
    expect(screen.queryByText("Apply fix")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Fix with AI"));
    expect(onAi).toHaveBeenCalledOnce();
  });

  it("shows an Applied badge and no actions for an applied fix", () => {
    render(
      <FindingCard
        finding={mk({ fixStatus: "applied" })}
        before={null}
        after={null}
        busy={false}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText("Applied")).toBeInTheDocument();
    fireEvent.click(screen.getByText("A code with no system."));
    expect(screen.queryByText("Apply fix")).not.toBeInTheDocument();
  });

  it("renders read-only with no action buttons", () => {
    render(
      <FindingCard
        finding={mk({})}
        before={null}
        after={null}
        busy={false}
        readOnly
        onApply={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("A code with no system."));
    expect(screen.queryByText("Apply fix")).not.toBeInTheDocument();
    expect(screen.queryByText("Dismiss")).not.toBeInTheDocument();
  });
});
