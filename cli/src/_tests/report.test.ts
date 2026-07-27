import { describe, expect, test } from "bun:test";
import type { Finding } from "fhirfix";
import { summarize } from "../gate.js";
import { annotationPath, renderGithubAnnotation, renderJobSummary } from "../report.js";


function finding(over: Partial<Finding> = {}): Finding {
  return {
    severity: "error",
    category: "terminology",
    resourceType: "Patient",
    fhirpath: "Patient.gender",
    ruleSource: "hapi",
    specCitation: "spec",
    plainMessage: "gender is not a valid code",
    suggestedFix: "use male",
    fixConfidence: "auto",
    fixStatus: "suggested",
    occurrenceCount: 1,
    ...over,
  };
}

describe("annotationPath", () => {
  test("makes the path relative to GITHUB_WORKSPACE", () => {
    expect(
      annotationPath("/home/runner/work/repo/repo/out/p.json", "/home/runner/work/repo/repo"),
    ).toBe("out/p.json");
  });

  test("normalizes windows separators to forward slashes", () => {
    expect(annotationPath("C:\\work\\repo\\out\\p.json", "C:\\work\\repo")).toBe("out/p.json");
  });

  test("tolerates a trailing slash on the workspace", () => {
    expect(annotationPath("/w/repo/a.json", "/w/repo/")).toBe("a.json");
  });

  test("leaves a path outside the workspace alone", () => {
    expect(annotationPath("/tmp/other.json", "/w/repo")).toBe("/tmp/other.json");
  });

  test("passes the path through when not running in a workspace", () => {
    expect(annotationPath("out/p.json", undefined)).toBe("out/p.json");
  });
});

describe("renderGithubAnnotation", () => {
  test("emits the workflow command with a relative file and title", () => {
    const line = renderGithubAnnotation("/w/repo/p.json", finding(), "/w/repo");
    expect(line).toStartWith("::error file=p.json,");
    expect(line).toContain("title=FHIR%3A terminology");
    expect(line).toContain("::gender is not a valid code");
  });

  test("maps info to notice, the runner's actual third level", () => {
    // "::info" is not a workflow command; the runner would print it as plain text.
    const line = renderGithubAnnotation("p.json", finding({ severity: "info" }));
    expect(line).toStartWith("::notice ");
  });

  test("warning keeps its own level", () => {
    expect(renderGithubAnnotation("p.json", finding({ severity: "warning" }))).toStartWith(
      "::warning ",
    );
  });

  test("percent-encodes newlines so the message is not truncated", () => {
    const line = renderGithubAnnotation("p.json", finding());
    // the suggested fix is joined with \n, which must not survive literally.
    expect(line).toContain("%0A");
    expect(line.split("\n")).toHaveLength(1);
  });

  test("escapes a comma and colon in the title property", () => {
    const line = renderGithubAnnotation("p.json", finding({ category: "must_support" }));
    // , and : delimit the command, so a raw one in a property breaks parsing.
    const title = line.slice(line.indexOf("title="), line.indexOf("::", 2));
    expect(title).not.toContain(":");
  });

  test("escapes a literal % before adding its own escapes", () => {
    const line = renderGithubAnnotation(
      "p.json",
      finding({ plainMessage: "50% failed", suggestedFix: "" }),
    );
    // if % were not escaped first, "%0A" in user text would be misread as a newline.
    expect(line).toContain("50%25 failed");
  });

  test("omits the suggested-fix line when there is none", () => {
    const line = renderGithubAnnotation("p.json", finding({ suggestedFix: "" }));
    expect(line).not.toContain("Suggested fix");
  });
});

describe("renderJobSummary", () => {
  test("says so plainly when nothing is blocking", () => {
    const summary = summarize([], "error");
    const md = renderJobSummary([{ file: "a.json", summary }]);
    expect(md).toContain("No conformance findings");
    expect(md).not.toContain("| File |");
  });

  test("renders a markdown table of blocking findings only", () => {
    const summary = summarize([finding(), finding({ severity: "info" })], "error");
    const md = renderJobSummary([{ file: "/w/repo/a.json", summary }], "/w/repo");
    expect(md).toContain("| File | Severity | Location | Problem |");
    // the info finding is below the threshold and must not appear.
    expect(md.match(/\| a\.json \|/g)).toHaveLength(1);
    expect(md).toContain("`Patient.gender`");
  });

  test("escapes a pipe so it cannot break the table", () => {
    const summary = summarize([finding({ plainMessage: "a|b" })], "error");
    const md = renderJobSummary([{ file: "a.json", summary }]);
    expect(md).toContain("a\\|b");
  });

  test("falls back to the resource type when there is no fhirpath", () => {
    const summary = summarize([finding({ fhirpath: null })], "error");
    const md = renderJobSummary([{ file: "a.json", summary }]);
    expect(md).toContain("`Patient`");
  });
});
