export type InfernoResult =
  | "pass"
  | "fail"
  | "skip"
  | "omit"
  | "error"
  | "running"
  | "wait"
  | "cancel";

export interface MatrixCell {
  requirementId: string;
  requirement: string;
  conformance: string;
  igIdentifier: string;
  testKit: string;
  result: InfernoResult;
  testIds: string[];
  message?: string;
}

export interface RegressionEntry {
  requirementId: string;
  testKit: string;
  requirement: string;
  from: InfernoResult;
  to: InfernoResult;
  direction: "fixed" | "regressed";
}

export interface PacketSummary {
  total: number;
  pass: number;
  fail: number;
  skip: number;
  other: number;
  overall: "pass" | "fail" | "partial";
}
