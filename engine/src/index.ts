// public engine surface. deterministic FHIR conformance + remediation.
// shared by backend (submit) and worker (execution).

export { ENGINE_VERSION, runRemediation } from "./remediate";
export type { RemediationInput, EngineDeps } from "./remediate";

export { getEngineDeps, _resetEngineDeps } from "./factory";
export type { EngineConfig } from "./factory";

export { ValidatorPool } from "./validator-client";
export type { ValidatorInstance, ValidatorPoolOptions } from "./validator-client";
export { ConverterClient, hl7RootTemplate } from "./converter-client";
export type { ConverterOptions, ConverterInputFormat } from "./converter-client";

export { detectInput } from "./detect";
export type { DetectResult } from "./detect";
export { normalizeOutcome, rankScore } from "./normalize";
export { fingerprint, stripIndices } from "./fingerprint";
export { deriveFix } from "./fixes";
export type { DerivedFix, FixContext } from "./fixes";
export { profileFor, allDefaultProfiles } from "./profiles";

export { SidecarError, CircuitOpenError, CircuitBreaker } from "./resilience";
export type { ResilienceOptions } from "./resilience";

export type {
  RemediationResult,
  EngineFinding,
  MappingSuggestion,
  RegistryMapping,
  OperationOutcome,
  OperationOutcomeIssue,
  Severity,
  FindingCategory,
  FixConfidence,
  FixStatus,
  FhirVersion,
  InputType,
} from "./types";
