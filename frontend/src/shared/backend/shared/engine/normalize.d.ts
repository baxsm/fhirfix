import type { EngineFinding, OperationOutcome, Severity } from "./types";
export declare function rankScore(severity: Severity, fixConfidence: "auto" | "one_click" | "manual", occurrenceCount: number): number;
export declare function normalizeOutcome(oo: OperationOutcome): EngineFinding[];
