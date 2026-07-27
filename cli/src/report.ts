import type { Finding } from "fhirfix";
import type { GateSummary } from "./gate.js";


const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const paint = (code: string, text: string) => (useColor ? `[${code}m${text}[0m` : text);

const red = (t: string) => paint("31", t);
const yellow = (t: string) => paint("33", t);
const blue = (t: string) => paint("34", t);
const dim = (t: string) => paint("2", t);
const bold = (t: string) => paint("1", t);

const SEVERITY_LABEL: Record<string, (t: string) => string> = {
  error: red,
  warning: yellow,
  info: blue,
};

const green = (t: string) => paint("32", t);

function severityTag(finding: Finding): string {
  if (finding.fixStatus === "applied") return green("fixed".padEnd(7));
  const paintFn = SEVERITY_LABEL[finding.severity] ?? dim;
  return paintFn(finding.severity.padEnd(7));
}

function locationOf(finding: Finding): string {
  return finding.fhirpath ?? finding.resourceType ?? "(document)";
}

export function renderText(file: string, summary: GateSummary, findings: Finding[]): string {
  const lines: string[] = [];
  lines.push(bold(file));

  if (findings.length === 0) {
    lines.push(`  ${dim("no findings")}`);
    return lines.join("\n");
  }

  for (const finding of findings) {
    lines.push(`  ${severityTag(finding)} ${locationOf(finding)}`);
    lines.push(`          ${finding.plainMessage}`);
    if (finding.suggestedFix) lines.push(`          ${dim(`fix: ${finding.suggestedFix}`)}`);
    if (finding.occurrenceCount > 1) {
      lines.push(`          ${dim(`${finding.occurrenceCount} occurrences`)}`);
    }
  }

  const counts = [
    summary.errors ? red(`${summary.errors} error${summary.errors === 1 ? "" : "s"}`) : null,
    summary.warnings
      ? yellow(`${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}`)
      : null,
    summary.infos ? blue(`${summary.infos} info`) : null,
    summary.applied ? green(`${summary.applied} fixed`) : null,
  ].filter(Boolean);
  lines.push(`  ${counts.length > 0 ? counts.join(", ") : dim("no findings")}`);

  return lines.join("\n");
}

export function annotationPath(file: string, workspace?: string): string {
  const normalized = file.replace(/\\/g, "/");
  if (!workspace) return normalized;
  const root = `${workspace.replace(/\\/g, "/").replace(/\/+$/, "")}/`;
  return normalized.startsWith(root) ? normalized.slice(root.length) : normalized;
}

export function renderGithubAnnotation(file: string, finding: Finding, workspace?: string): string {
  // "info" is not an annotation level; the runner's third level is "notice".
  const level = finding.severity === "info" ? "notice" : finding.severity;
  const title = encodeProperty(`FHIR: ${finding.category}`);
  const message = encodeData(
    finding.suggestedFix
      ? `${finding.plainMessage}\nSuggested fix: ${finding.suggestedFix}`
      : finding.plainMessage,
  );
  const path = encodeProperty(annotationPath(file, workspace));
  return `::${level} file=${path},title=${title}::${message}`;
}

function encodeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

// property values additionally must not contain , or : which delimit the command.
function encodeProperty(value: string): string {
  return encodeData(value).replace(/,/g, "%2C").replace(/:/g, "%3A");
}

export interface JsonReport {
  file: string;
  runId: string;
  passed: boolean;
  conformanceScoreBefore: number;
  conformanceScoreAfter?: number;
  findingsTotal: number;
  errors: number;
  warnings: number;
  infos: number;
  findings: Finding[];
}

export function renderSummaryLine(files: number, summary: GateSummary, failOn: string): string {
  const scope = `${files} file${files === 1 ? "" : "s"}`;
  if (summary.passed) {
    const noted = summary.total > 0 ? dim(` (${summary.total} below --fail-on ${failOn})`) : "";
    return `${scope}: no findings at or above ${failOn}${noted}`;
  }
  return `${scope}: ${summary.blocking.length} finding${
    summary.blocking.length === 1 ? "" : "s"
  } at or above ${failOn}`;
}

export function renderJobSummary(
  rows: Array<{ file: string; summary: GateSummary }>,
  workspace?: string,
): string {
  const lines: string[] = ["## FHIRfix", ""];
  const total = rows.reduce((n, r) => n + r.summary.blocking.length, 0);

  if (total === 0) {
    lines.push("No conformance findings above the threshold.");
    return `${lines.join("\n")}\n`;
  }

  lines.push("| File | Severity | Location | Problem |", "| --- | --- | --- | --- |");
  for (const { file, summary } of rows) {
    for (const finding of summary.blocking) {
      // a pipe inside a cell would break the table.
      const message = finding.plainMessage.replace(/\|/g, "\\|");
      const path = annotationPath(file, workspace);
      lines.push(`| ${path} | ${finding.severity} | \`${locationOf(finding)}\` | ${message} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}
