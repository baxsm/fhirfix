import type { FhirVersion, InputType } from "./types";
export interface DetectResult {
    inputType: InputType;
    fhirVersion: FhirVersion;
    v2Version?: string;
    parsed?: unknown;
}
export declare function detectInput(raw: string): DetectResult;
