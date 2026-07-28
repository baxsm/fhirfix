import { type ResilienceOptions } from "./resilience";
export interface InfernoOptions {
    baseUrl: string;
    resilience?: Partial<ResilienceOptions>;
}
export declare const INFERNO_RESULTS: readonly ["pass", "fail", "skip", "omit", "error", "running", "wait", "cancel"];
export type InfernoResult = (typeof INFERNO_RESULTS)[number];
export declare const TERMINAL_RUN_STATUSES: readonly ["done", "cancelling"];
export interface AuthInfo {
    auth_type?: string;
    token_url?: string;
    auth_url?: string;
    requested_scopes?: string;
    client_id?: string;
    client_secret?: string;
    access_token?: string;
    use_discovery?: string;
}
export interface InfernoInput {
    name: string;
    value: string;
}
export interface InfernoMessage {
    type: "error" | "warning" | "info";
    message: string;
}
export interface InfernoTestResult {
    id: string;
    result: InfernoResult;
    test_id?: string;
    test_group_id?: string;
    test_suite_id?: string;
    result_message?: string;
    messages?: InfernoMessage[];
    updated_at?: string;
}
export interface InfernoTestRun {
    id: string;
    test_session_id: string;
    status?: string;
    test_count?: number;
    results?: InfernoTestResult[];
}
export interface InfernoRequirement {
    id: string;
    requirement: string;
    conformance: string;
    actors: string[];
    url?: string;
    subrequirements?: string[];
    not_tested_reason?: string;
}
export interface InfernoTestNode {
    id: string;
    short_title?: string;
    title?: string;
    verifies_requirements?: string[];
    tests?: InfernoTestNode[];
    test_groups?: InfernoTestNode[];
}
export interface InfernoSuiteInput {
    name: string;
    optional?: boolean;
    type?: string;
    default?: string;
}
export interface InfernoSuite extends InfernoTestNode {
    version?: string;
    requirement_sets?: Array<{
        identifier: string;
        title?: string;
    }>;
    test_groups?: InfernoTestNode[];
    inputs?: InfernoSuiteInput[];
}
export declare class InfernoClient {
    private readonly opts;
    private readonly breaker;
    constructor(opts: InfernoOptions);
    private url;
    private json;
    version(): Promise<string>;
    ready(): Promise<boolean>;
    suite(suiteId: string): Promise<InfernoSuite>;
    requirements(suiteId: string): Promise<InfernoRequirement[]>;
    createSession(suiteId: string, suiteOptions?: Array<{
        id: string;
        value: string;
    }>): Promise<string>;
    startRun(sessionId: string, suiteId: string, inputs: InfernoInput[]): Promise<InfernoTestRun>;
    getRun(runId: string, after?: string): Promise<InfernoTestRun>;
    runResults(runId: string): Promise<InfernoTestResult[]>;
    cancelRun(runId: string): Promise<void>;
}
export declare function isRunFinished(run: InfernoTestRun): boolean;
export declare function requiredSuiteInputs(suite: InfernoSuite, provided: Record<string, string>): InfernoInput[];
export declare function flattenRequirementIds(node: InfernoTestNode): Map<string, string[]>;
