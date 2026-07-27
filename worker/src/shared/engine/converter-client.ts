import { CircuitBreaker, type ResilienceOptions, resilientFetch } from "./resilience";

export interface ConverterOptions {
  baseUrl: string;
  apiVersion?: string;
  resilience?: Partial<ResilienceOptions>;
}

export type ConverterInputFormat = "Hl7v2" | "Ccda" | "Json" | "Fhir_STU3";

export class ConverterClient {
  private readonly breaker: CircuitBreaker;
  private readonly apiVersion: string;
  constructor(private readonly opts: ConverterOptions) {
    this.apiVersion = opts.apiVersion ?? "2024-05-01-preview";
    this.breaker = new CircuitBreaker(`converter@${opts.baseUrl}`, {
      timeoutMs: 30_000,
      retries: 2,
      backoffBaseMs: 300,
      circuitThreshold: 5,
      circuitResetMs: 15_000,
      ...opts.resilience,
    });
  }

  async ready(): Promise<boolean> {
    try {
      const res = await resilientFetch(
        "converter.health",
        this.breaker,
        `${this.opts.baseUrl}/health/check`,
        { method: "GET" },
        { ...this.opts.resilience, timeoutMs: 10_000, retries: 1 },
      );
      const body = (await res.json()) as { overallStatus?: string };
      return body.overallStatus === "Healthy";
    } catch {
      return false;
    }
  }

  async convert(
    input: string,
    format: ConverterInputFormat,
    rootTemplate: string,
  ): Promise<unknown> {
    const res = await resilientFetch(
      "converter.convert",
      this.breaker,
      `${this.opts.baseUrl}/convertToFhir?api-version=${this.apiVersion}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          InputDataFormat: format,
          RootTemplateName: rootTemplate,
          InputDataString: input,
        }),
      },
      this.opts.resilience,
    );
    const body = (await res.json()) as { result?: unknown };
    return body.result;
  }
}

export function hl7RootTemplate(raw: string): string {
  const msh = raw.split(/\r?\n|\r/)[0] ?? "";
  const fields = msh.split("|");
  // MSH-9 is at index 8: "ADT^A01".
  const msgType = fields[8] ?? "";
  const parts = msgType.split("^").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}_${parts[1]}`;
  if (parts.length === 1 && parts[0]) return parts[0];
  return "ADT_A01";
}
