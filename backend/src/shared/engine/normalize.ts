import { fingerprint } from "./fingerprint";
import type {
  EngineFinding,
  FindingCategory,
  OperationOutcome,
  OperationOutcomeIssue,
  Severity,
} from "./types";

const ISSUE_SOURCE_URL = "http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-source";
const MESSAGE_ID_URL = "http://hl7.org/fhir/StructureDefinition/operationoutcome-message-id";

// extract the wrapper's extension metadata: which engine flagged it and the rule id.
function readExtensions(issue: OperationOutcomeIssue): { source?: string; messageId?: string } {
  let source: string | undefined;
  let messageId: string | undefined;
  for (const ext of issue.extension ?? []) {
    if (ext.url === ISSUE_SOURCE_URL) source = ext.valueString;
    if (ext.url === MESSAGE_ID_URL) messageId = ext.valueCode;
  }
  return { source, messageId };
}

// map the HAPI issue code + source to our finding category.
function categorize(issue: OperationOutcomeIssue, source?: string): FindingCategory {
  const code = issue.code;
  const text = issue.details?.text ?? issue.diagnostics ?? "";
  if (source === "TerminologyEngine" || code === "code-invalid") return "terminology";
  if (code === "invariant") return "invariant";
  if (code === "structure" || code === "value" || code === "required") {
    if (/minimum required|cardinality|must have|maximum/i.test(text)) return "cardinality";
    if (/must[- ]support/i.test(text)) return "must_support";
    return "structural";
  }
  if (code === "invalid") {
    if (/Coding has no system|value set|not in the value set/i.test(text)) return "terminology";
    return "structural";
  }
  if (/reference/i.test(text)) return "reference";
  if (/slice|profile|us-?core/i.test(text)) return "profile";
  return "structural";
}

function resourceTypeFromPath(fhirpath?: string): string | undefined {
  if (!fhirpath) return undefined;
  const head = fhirpath.split(".")[0];
  return head && /^[A-Z]/.test(head) ? head : undefined;
}

function pathFromCardinalityMessage(text: string, fhirpath?: string): string | undefined {
  const named = text.match(/^([A-Z]\w*(?:\.\w+(?:\[\d+\])?)+):\s*(?:minimum required|max)/)?.[1];
  if (!named) return undefined;
  if (fhirpath && !named.startsWith(`${fhirpath}.`)) return undefined;
  return named;
}

function plainLanguage(
  category: FindingCategory,
  issue: OperationOutcomeIssue,
  fhirpath?: string,
): string {
  const path = fhirpath ?? "the resource";
  const text = issue.details?.text ?? issue.diagnostics ?? "";
  if (/Coding has no system/i.test(text)) {
    return `${path} has a code with no system, so it can't be validated. Add the code system this value comes from.`;
  }
  if (/None of the codings provided are in the value set/i.test(text)) {
    const vs = text.match(/value set '([^']+)'/i)?.[1];
    return `The code at ${path} isn't from the expected value set${vs ? ` (${vs})` : ""}. Map it to a conformant code.`;
  }
  if (category === "terminology" && issue.code === "code-invalid") {
    return `${path} carries a code that isn't valid for its required value set. Replace it with a valid code.`;
  }
  if (category === "invariant") {
    const rule = text.match(/Constraint failed: ([\w-]+):/i)?.[1];
    return `${path} fails a FHIR rule${rule ? ` (${rule})` : ""}. ${text.replace(/Constraint failed: [\w-]+: '?/i, "").replace(/'.*$/, "")}`.trim();
  }
  if (/Slice.*not.*match|does not match slice/i.test(text)) {
    return `${path} doesn't match a required profile slice. Align it with the profile's expected shape.`;
  }
  if (/Unknown extension|not allowed/i.test(text)) {
    return `${path} uses an element the profile doesn't allow. Remove it or use the profile-defined element.`;
  }
  if (/minimum required|must have|is required/i.test(text)) {
    const min = text.match(/minimum required = (\d+)/)?.[1];
    const needs = min && Number(min) > 1 ? `at least ${min} values` : "a value";
    return `${path} is required by the profile but missing. Provide ${needs}.`;
  }
  // fall back to a lightly cleaned version of the raw text.
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : `Conformance issue at ${path}.`;
}

// spec citation string shown next to a finding. best-effort from the message id.
function specCitation(messageId?: string, source?: string): string {
  if (messageId) return messageId;
  if (source) return source;
  return "FHIR R4 base";
}

export function rankScore(
  severity: Severity,
  fixConfidence: "auto" | "one_click" | "manual",
  occurrenceCount: number,
): number {
  const sev = severity === "error" ? 300 : severity === "warning" ? 150 : 50;
  const fix = fixConfidence === "auto" ? 60 : fixConfidence === "one_click" ? 40 : 10;
  const occ = Math.min(occurrenceCount, 100); // cap so one huge cluster can't dominate
  return sev + fix + occ;
}

export function normalizeOutcome(oo: OperationOutcome): EngineFinding[] {
  const issues = (oo.issue ?? []).filter(
    (i) => i.severity === "error" || i.severity === "warning",
  );

  const byFingerprint = new Map<string, EngineFinding>();
  for (const issue of issues) {
    const { source, messageId } = readExtensions(issue);
    const rawPath = issue.expression?.[0] ?? issue.location?.[0];
    const issueText = issue.details?.text ?? issue.diagnostics ?? "";
    const fhirpath = pathFromCardinalityMessage(issueText, rawPath) ?? rawPath;
    const category = categorize(issue, source);
    const resourceType = resourceTypeFromPath(fhirpath);
    const fp = fingerprint({ ruleSource: messageId ?? issue.code, category, resourceType, fhirpath });

    const existing = byFingerprint.get(fp);
    if (existing) {
      existing.occurrenceCount += 1;
      continue;
    }
    byFingerprint.set(fp, {
      severity: issue.severity,
      category,
      ruleSource: specCitation(messageId, source),
      specCitation: specCitation(messageId, source),
      resourceType,
      fhirpath,
      rawValidatorMessage: issue.details?.text ?? issue.diagnostics ?? "(no message)",
      plainMessage: plainLanguage(category, issue, fhirpath),
      suggestedFix: "Review this finding.", // replaced by the fix module
      fixConfidence: "manual",
      fixStatus: "manual_needed",
      dedupFingerprint: fp,
      occurrenceCount: 1,
      rank: 0,
    });
  }

  const findings = [...byFingerprint.values()];
  for (const f of findings) {
    f.rank = rankScore(f.severity, f.fixConfidence, f.occurrenceCount);
  }
  findings.sort((a, b) => b.rank - a.rank);
  return findings;
}
