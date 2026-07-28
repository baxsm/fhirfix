import { type InfernoRequirement, type InfernoResult, type InfernoSuite, type InfernoTestResult } from "./inferno-client";
export type TestKitId = "plan_net" | "pdex" | "pas" | "crd" | "dtr";
export interface TestKitDefinition {
    id: TestKitId;
    label: string;
    suiteId: string;
    igIdentifier: string;
    igVersion: string;
    kitVersion: string;
    attended: boolean;
    attendedReason?: string;
}
export declare const TEST_KITS: TestKitDefinition[];
export declare function automatableKits(): TestKitDefinition[];
export interface MatrixCell {
    requirementId: string;
    requirement: string;
    conformance: string;
    igIdentifier: string;
    testKit: TestKitId;
    result: InfernoResult;
    testIds: string[];
    message?: string;
}
export interface MatrixSummary {
    total: number;
    pass: number;
    fail: number;
    skip: number;
    other: number;
    overall: "pass" | "fail" | "partial";
}
export interface RegressionEntry {
    requirementId: string;
    testKit: TestKitId;
    requirement: string;
    from: InfernoResult;
    to: InfernoResult;
    direction: "fixed" | "regressed";
}
export declare function buildCoverageMatrix(kit: TestKitDefinition, suite: InfernoSuite, requirements: InfernoRequirement[], results: InfernoTestResult[]): MatrixCell[];
export declare function summarizeMatrix(cells: MatrixCell[]): MatrixSummary;
export declare function diffMatrices(previous: MatrixCell[], current: MatrixCell[]): RegressionEntry[];
