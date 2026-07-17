import { type ResilienceOptions } from "./resilience";
export interface ConverterOptions {
    baseUrl: string;
    apiVersion?: string;
    resilience?: Partial<ResilienceOptions>;
}
export type ConverterInputFormat = "Hl7v2" | "Ccda" | "Json" | "Fhir_STU3";
export declare class ConverterClient {
    private readonly opts;
    private readonly breaker;
    private readonly apiVersion;
    constructor(opts: ConverterOptions);
    ready(): Promise<boolean>;
    convert(input: string, format: ConverterInputFormat, rootTemplate: string): Promise<unknown>;
}
export declare function hl7RootTemplate(raw: string): string;
