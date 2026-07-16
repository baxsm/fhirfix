// the public REST API's wire types. these mirror backend/src/routes/api-v1 and are
// intentionally standalone: a published SDK cannot import the backend's @shared
// alias, because tsconfig `paths` are not rewritten in emitted js and would break
// every consumer.

export type Severity = "error" | "warning" | "info";

export type FindingCategory =
  | "structural"
  | "profile"
  | "terminology"
  | "cardinality"
  | "invariant"
  | "reference"
  | "must_support";

export type FixConfidence = "auto" | "one_click" | "manual";

export type FixStatus = "applied" | "suggested" | "skipped" | "manual_needed" | "dismissed";

export type InputType = "hl7v2" | "fhir_json" | "fhir_xml" | "ndjson" | "bundle" | "zip";

export type RunStatus = "queued" | "running" | "completed" | "failed";

export type KeyMode = "test" | "live";

// a single conformance problem. the REST layer strips db ids and the raw validator
// echo, so this is narrower than the engine's internal finding.
export interface Finding {
  severity: Severity;
  category: FindingCategory;
  resourceType: string | null;
  fhirpath: string | null;
  ruleSource: string;
  specCitation: string;
  plainMessage: string;
  suggestedFix: string;
  fixConfidence: FixConfidence;
  fixStatus: FixStatus;
  occurrenceCount: number;
}

// the shared body for validate/fix/convert.
export interface RunInput {
  // a FHIR resource/bundle (json) or an HL7v2 message. 5MB max.
  input: string;
  // profile urls to validate against. defaults to the workspace profile.
  profiles?: string[];
  // redact PHI from the corrected output.
  redact?: boolean;
  // makes the call replay-safe. same key + same body replays the prior run,
  // same key + different body is rejected with 409.
  idempotencyKey?: string;
}

export interface ValidateResult {
  runId: string;
  status: "completed";
  inputType: InputType;
  resourceCount: number;
  conformanceScoreBefore: number;
  findingsTotal: number;
  findingsAutoFixable: number;
  findings: Finding[];
}

export interface FixResult {
  runId: string;
  status: "completed";
  inputType: InputType;
  resourceCount: number;
  conformanceScoreBefore: number;
  conformanceScoreAfter: number;
  reVerifiedClean: boolean;
  findingsTotal: number;
  findingsAutoFixable: number;
  findings: Finding[];
  // the corrected artifact, serialized json.
  corrected: string;
}

export interface ConvertResult {
  runId: string;
  status: "completed";
  inputType: InputType;
  resourceCount: number;
  // the converted FHIR, serialized json.
  fhir: string;
  findings: Finding[];
}

export interface BatchResult {
  runId: string;
  status: "queued";
}

export interface Run {
  id: string;
  status: RunStatus;
  inputType: InputType;
  source: string;
  resourceCount: number;
  conformanceScoreBefore: number | null;
  conformanceScoreAfter: number | null;
  findingsTotal: number;
  findingsAutoFixable: number;
  creditsCharged: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RunDetail {
  run: Run;
  findings: Finding[];
}

export interface ListRunsParams {
  status?: RunStatus;
  inputType?: InputType;
  from?: Date | string;
  to?: Date | string;
  // the last seen createdAt; results are newest-first.
  cursor?: string;
  limit?: number;
}

export interface RunPage {
  runs: Run[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PingResult {
  ok: true;
  workspaceId: string;
  mode: KeyMode;
  scopes: string[];
}

export type ReportFormat = "json" | "operationoutcome" | "pdf";
