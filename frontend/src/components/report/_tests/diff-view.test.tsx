import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiffView } from "../diff-view";

const before = '{\n  "system": "http://example.com/mrn",\n  "value": "10009"\n}';
const after = '{\n  "system": "http://northwind-health.org/mrn",\n  "value": "10009"\n}';

describe("DiffView", () => {
  it("renders the changed-line count and both panes in split mode", () => {
    render(<DiffView before={before} after={after} />);
    expect(screen.getByText(/changed line/)).toBeInTheDocument();
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
  });

  it("toggles to unified view", () => {
    render(<DiffView before={before} after={after} />);
    fireEvent.click(screen.getByText("Unified"));
    // unified drops the Before/After column headers.
    expect(screen.queryByText("Before")).not.toBeInTheDocument();
  });

  it("uses custom pane labels", () => {
    render(
      <DiffView before={before} after={after} beforeLabel="Submitted" afterLabel="Corrected" />,
    );
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Corrected")).toBeInTheDocument();
  });

  it("collapses to a single pane when nothing changed", () => {
    render(<DiffView before={before} after={before} />);
    expect(screen.getByText("No proposed change to this fragment")).toBeInTheDocument();
    expect(screen.queryByText("Unified")).not.toBeInTheDocument();
  });

  it("pretty-prints a minified side instead of diffing it as one long line", () => {
    const minified = '{"system":"http://example.com/mrn","value":"10009"}';
    const { container } = render(<DiffView before={minified} after={after} />);
    expect(screen.getByText(/changed line/)).toBeInTheDocument();
    // the unchanged closing brace only lines up once both sides are formatted
    expect(container.textContent).toContain('"value": "10009"');
  });
});
