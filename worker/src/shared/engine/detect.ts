import type { FhirVersion, InputType } from "./types";

export interface DetectResult {
  inputType: InputType;
  fhirVersion: FhirVersion; // best-effort; defaults R4 for HL7v2 (converter target)
  v2Version?: string; // MSH-12 for HL7v2
  parsed?: unknown; // parsed JSON when the input is FHIR JSON
}

// r5-only and r4b-only resource types are the cheapest version signal.
const R5_ONLY = new Set([
  "SubscriptionTopic",
  "ActorDefinition",
  "Requirements",
  "TestPlan",
  "InventoryItem",
  "FormularyItem",
]);
const R4B_ONLY = new Set(["AdministrableProductDefinition", "SubscriptionStatus"]);

// detect the input format and, for FHIR, its version. deterministic, no network.
export function detectInput(raw: string): DetectResult {
  const trimmed = raw.trimStart();

  // HL7v2: starts with the MSH segment header.
  if (trimmed.startsWith("MSH|")) {
    return { inputType: "hl7v2", fhirVersion: "R4", v2Version: parseMshVersion(trimmed) };
  }

  // FHIR XML.
  if (trimmed.startsWith("<")) {
    return { inputType: "fhir_xml", fhirVersion: detectXmlVersion(trimmed) };
  }

  // NDJSON: multiple JSON objects, one per line.
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length > 1 && lines.every((l) => l.trim().startsWith("{"))) {
    const first = safeParse(lines[0] ?? "");
    return { inputType: "ndjson", fhirVersion: detectJsonVersion(first) };
  }

  // FHIR JSON (single resource or bundle).
  const parsed = safeParse(trimmed);
  if (parsed && typeof parsed === "object") {
    const rt = (parsed as { resourceType?: string }).resourceType;
    const version = detectJsonVersion(parsed);
    if (rt === "Bundle") return { inputType: "bundle", fhirVersion: version, parsed };
    return { inputType: "fhir_json", fhirVersion: version, parsed };
  }

  // unknown text: treat as FHIR JSON so validation surfaces a clear parse error.
  return { inputType: "fhir_json", fhirVersion: "R4", parsed: undefined };
}

function parseMshVersion(msh: string): string | undefined {
  const firstSegment = msh.split(/\r?\n|\r/)[0] ?? "";
  const fields = firstSegment.split("|");
  // MSH-12 is the version id. field[0]=MSH, so MSH-12 sits at index 11.
  const version = fields[11]?.trim();
  return version && version.length > 0 ? version : undefined;
}

function detectJsonVersion(res: unknown): FhirVersion {
  if (!res || typeof res !== "object") return "R4";
  const obj = res as { resourceType?: string; entry?: Array<{ resource?: { resourceType?: string } }> };
  const types: string[] = [];
  if (obj.resourceType) types.push(obj.resourceType);
  for (const e of obj.entry ?? []) {
    if (e.resource?.resourceType) types.push(e.resource.resourceType);
  }
  if (types.some((t) => R5_ONLY.has(t))) return "R5";
  if (types.some((t) => R4B_ONLY.has(t))) return "R4B";
  return "R4";
}

function detectXmlVersion(xml: string): FhirVersion {
  if (R5_ONLY.size && [...R5_ONLY].some((t) => xml.includes(`<${t}`))) return "R5";
  if ([...R4B_ONLY].some((t) => xml.includes(`<${t}`))) return "R4B";
  return "R4";
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}
