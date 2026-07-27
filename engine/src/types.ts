
export type FhirVersion = "R4" | "R4B" | "R5";

export type InputType = "hl7v2" | "fhir_json" | "fhir_xml" | "ndjson" | "bundle" | "zip";

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

// the raw shape a HAPI OperationOutcome issue arrives in from the validator wrapper.
export interface OperationOutcomeIssue {
  severity: Severity;
  code: string;
  details?: { text?: string };
  diagnostics?: string;
  expression?: string[];
  location?: string[];
  extension?: Array<{ url: string; valueString?: string; valueCode?: string; valueInteger?: number }>;
}

export interface OperationOutcome {
  resourceType: "OperationOutcome";
  issue?: OperationOutcomeIssue[];
}

// a normalized finding before it is persisted. no db ids yet.
export interface EngineFinding {
  severity: Severity;
  category: FindingCategory;
  ruleSource: string;
  specCitation: string;
  resourceType?: string;
  fhirpath?: string;
  rawValidatorMessage: string;
  plainMessage: string;
  suggestedFix: string;
  fixConfidence: FixConfidence;
  fixStatus: FixStatus;
  dedupFingerprint: string;
  occurrenceCount: number;
  rank: number;
}

export interface RegistryMapping {
  type: "authority_to_system" | "code_to_code" | "facility_to_org" | "custom";
  sourceValue: string;
  targetValue: string;
  targetSystem: string | null;
  status: "active";
}

// an auto-learned mapping the engine emits when it hits an unmapped authority/code.
export interface MappingSuggestion {
  type: RegistryMapping["type"];
  sourceValue: string;
  targetValue: string;
  targetSystem: string | null;
  confidence: number; // 0-100
  reason: string;
}

// the full result of a remediation run, returned by runRemediation().
export interface RemediationResult {
  inputType: InputType;
  fhirVersion: FhirVersion;
  profilesApplied: string[];
  resourceCount: number;
  conformanceScoreBefore: number; // 0-1000
  conformanceScoreAfter: number;
  autoFixApplied: boolean;
  findings: EngineFinding[];
  findingsTotal: number;
  findingsAutoFixable: number;
  suggestions: MappingSuggestion[];
  correctedResource: unknown; // the fixed FHIR resource/bundle
  reVerifiedClean: boolean;
}
