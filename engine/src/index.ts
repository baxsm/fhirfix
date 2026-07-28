
export { ENGINE_VERSION, runRemediation } from "./remediate";
export type { RemediationInput, EngineDeps } from "./remediate";

export { applyFixes, fixWithAi } from "./apply";
export type { ApplyFixInput, ApplyFixResult, AiFixInput, AiFixResult } from "./apply";

export { getEngineDeps, _resetEngineDeps } from "./factory";
export type { EngineConfig } from "./factory";

export { ValidatorPool } from "./validator-client";
export type { ValidatorInstance, ValidatorPoolOptions } from "./validator-client";
export { ConverterClient, hl7RootTemplate } from "./converter-client";
export type { ConverterOptions, ConverterInputFormat } from "./converter-client";
export {
  InfernoClient,
  INFERNO_RESULTS,
  flattenRequirementIds,
  isRunFinished,
  requiredSuiteInputs,
} from "./inferno-client";
export type {
  InfernoOptions,
  InfernoResult,
  InfernoTestRun,
  InfernoTestResult,
  InfernoRequirement,
  InfernoSuite,
  InfernoInput,
  InfernoSuiteInput,
  AuthInfo,
} from "./inferno-client";
export {
  buildCoverageMatrix,
  diffMatrices,
  summarizeMatrix,
  TEST_KITS,
  automatableKits,
  willAuthenticate,
} from "./conformance";
export type {
  MatrixCell,
  MatrixSummary,
  RegressionEntry,
  TestKitDefinition,
  TestKitId,
} from "./conformance";

export { detectInput } from "./detect";
export type { DetectResult } from "./detect";
export { normalizeOutcome, rankScore } from "./normalize";
export { fingerprint, stripIndices } from "./fingerprint";
export { deriveFix } from "./fixes";
export type { DerivedFix, FixContext } from "./fixes";
export { profileFor, allDefaultProfiles } from "./profiles";

export { SidecarError, CircuitOpenError, CircuitBreaker, describeSidecarError } from "./resilience";
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
