import { getAtPath, setAtPath } from "./fhir-path";
import type { EngineFinding, FixConfidence, MappingSuggestion, RegistryMapping } from "./types";

// a concrete patch a deriver produces for one finding.
export interface DerivedFix {
  fhirpath: string;
  before: unknown;
  after: unknown;
  confidence: FixConfidence;
  safe: boolean; // safe fixes are auto-applied; unsafe never are
  suggestedFix: string; // human text
  apply: (resource: unknown) => boolean; // mutates a clone
}

export interface FixContext {
  mappings: RegistryMapping[];
  suggestions: MappingSuggestion[]; // derivers push auto-learned entries here
}

const V2_0203_SYSTEM = "http://terminology.hl7.org/CodeSystem/v2-0203";
const ADMIN_GENDER_VALUES = new Set(["male", "female", "other", "unknown"]);

// canonical display strings the validator requires for each v2-0203 code.
const V2_0203_DISPLAY: Record<string, string> = {
  MR: "Medical record number",
  SS: "Social Security number",
  DL: "Driver's license number",
  PPN: "Passport number",
  NH: "National Health Plan Identifier",
  NI: "National unique individual identifier",
  PRN: "Provider number",
  MA: "Patient Medicaid number",
};

// HL7 Table 0001 administrative gender -> FHIR AdministrativeGender.
const GENDER_MAP: Record<string, string> = {
  M: "male",
  F: "female",
  O: "other",
  U: "unknown",
  A: "other", // ambiguous
  N: "other", // not applicable
};

function lookupMapping(
  ctx: FixContext,
  type: RegistryMapping["type"],
  sourceValue: string,
): RegistryMapping | undefined {
  return ctx.mappings.find(
    (m) => m.type === type && m.status === "active" && m.sourceValue === sourceValue,
  );
}

// derive a fix for a coding-with-no-system finding on identifier.type.coding.
// the v2 converter emits type.coding codes (MRN, NHSNMBR) with no system; the
// conformant system for identifier type codes is HL7 v2-0203. deterministic + safe.
function deriveIdentifierTypeSystem(
  resource: unknown,
  finding: EngineFinding,
): DerivedFix | undefined {
  if (!finding.fhirpath) return undefined;
  const coding = getAtPath(resource, finding.fhirpath) as
    | { system?: string; code?: string; display?: string }
    | undefined;
  if (!coding || coding.system) return undefined;
  if (!coding.code) return undefined;
  // only assert v2-0203 when the code is a known v2-0203 identifier-type code.
  const known = new Set(["MR", "MRN", "SS", "SB", "DL", "PPN", "NH", "NI", "PRN", "MA"]);
  if (!known.has(coding.code)) return undefined;
  // MRN is the converter's shorthand; the real v2-0203 code is MR.
  const normalizedCode = coding.code === "MRN" ? "MR" : coding.code;
  // v2-0203 requires the exact display string for each code, else the validator
  // errors with "Wrong Display Name". carry the canonical display.
  const display = V2_0203_DISPLAY[normalizedCode];
  const after: { system: string; code: string; display?: string } = {
    system: V2_0203_SYSTEM,
    code: normalizedCode,
    ...(display ? { display } : coding.display ? { display: coding.display } : {}),
  };
  return {
    fhirpath: finding.fhirpath,
    before: coding,
    after,
    confidence: "auto",
    safe: true,
    suggestedFix: `Set the code system to HL7 v2-0203, normalize the code to "${normalizedCode}"${display ? `, and correct the display to "${display}"` : ""}.`,
    apply: (r) => setAtPath(r, finding.fhirpath as string, after),
  };
}

// derive identifier.system from the assigning authority via the registry.
// the v2 converter emits a placeholder system (http://example.com/...); we replace
// it with the mapped canonical system for the authority. if unmapped, emit a
// suggestion and leave a one-click/manual finding.
function deriveIdentifierSystem(
  resource: unknown,
  finding: EngineFinding,
  ctx: FixContext,
): DerivedFix | undefined {
  // the finding path points at identifier[n].system; read the sibling identifier.
  if (!finding.fhirpath) return undefined;
  if (!/identifier(\[\d+\])?\.system$/.test(finding.fhirpath)) return undefined;
  const idPath = finding.fhirpath.replace(/\.system$/, "");
  const identifier = getAtPath(resource, idPath) as
    | { system?: string; value?: string; type?: { coding?: Array<{ code?: string }> } }
    | undefined;
  if (!identifier) return undefined;
  const currentSystem = identifier.system ?? "";
  const isPlaceholder = /example\.com|v2-to-fhir-converter|example\.org\/mrn/i.test(currentSystem);
  if (currentSystem && !isPlaceholder) return undefined;

  // the assigning authority is encoded in the placeholder tail or the identifier type.
  const authority =
    currentSystem.split("/").filter(Boolean).pop() ??
    identifier.type?.coding?.[0]?.code ??
    "";
  const mapped = lookupMapping(ctx, "authority_to_system", authority);
  if (mapped) {
    const after = mapped.targetValue;
    return {
      fhirpath: `${idPath}.system`,
      before: currentSystem,
      after,
      confidence: "auto",
      safe: true,
      suggestedFix: `Replace the placeholder system with the registered system for "${authority}" (${after}).`,
      apply: (r) => setAtPath(r, `${idPath}.system`, after),
    };
  }
  // unmapped authority: learn it as a suggestion, surface a one-click finding.
  if (authority) {
    ctx.suggestions.push({
      type: "authority_to_system",
      sourceValue: authority,
      targetValue: `urn:fhirfix:unmapped:${authority.toLowerCase()}`,
      targetSystem: null,
      confidence: 40,
      reason: `Authority "${authority}" appeared with a placeholder identifier system and has no registry entry.`,
    });
  }
  return {
    fhirpath: `${idPath}.system`,
    before: currentSystem,
    after: undefined,
    confidence: "one_click",
    safe: false,
    suggestedFix: `No registry mapping for authority "${authority}". Add one (authority -> system) to auto-fix this and future records.`,
    apply: () => false,
  };
}

// reformat a bad date/dateTime. HL7v2 dates arrive as YYYYMMDD; FHIR needs
// YYYY-MM-DD. deterministic + safe when the shape is unambiguous.
function deriveDateReformat(resource: unknown, finding: EngineFinding): DerivedFix | undefined {
  if (!finding.fhirpath) return undefined;
  if (!/date|birthDate|period|instant|dateTime/i.test(finding.fhirpath)) return undefined;
  const value = getAtPath(resource, finding.fhirpath);
  if (typeof value !== "string") return undefined;
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(\d{6})?$/);
  if (!m) return undefined;
  const after = `${m[1]}-${m[2]}-${m[3]}`;
  return {
    fhirpath: finding.fhirpath,
    before: value,
    after,
    confidence: "auto",
    safe: true,
    suggestedFix: `Reformat the date from "${value}" to ISO 8601 "${after}".`,
    apply: (r) => setAtPath(r, finding.fhirpath as string, after),
  };
}

// map a raw HL7 gender code to a FHIR AdministrativeGender via Table 0001.
// only fires when the value is a known table code, not already a valid FHIR value.
function deriveGender(resource: unknown, finding: EngineFinding): DerivedFix | undefined {
  if (!finding.fhirpath || !/gender$/i.test(finding.fhirpath)) return undefined;
  const value = getAtPath(resource, finding.fhirpath);
  if (typeof value !== "string" || ADMIN_GENDER_VALUES.has(value)) return undefined;
  const mapped = GENDER_MAP[value.toUpperCase()];
  if (!mapped) return undefined;
  return {
    fhirpath: finding.fhirpath,
    before: value,
    after: mapped,
    confidence: "auto",
    safe: true,
    suggestedFix: `Map the HL7 gender code "${value}" to the FHIR value "${mapped}" (HL7 Table 0001).`,
    apply: (r) => setAtPath(r, finding.fhirpath as string, mapped),
  };
}

// proactive scan for the v2 converter's placeholder identifier systems. the
// converter emits http://example.com/... systems that are never conformant, and
// a lenient validator may not error on them, so we remap them deterministically
// regardless of whether a validator finding pointed at the system. returns the
// list of applied fixes (for reporting) and mutates the resource in place.
export function remapPlaceholderSystems(
  resource: unknown,
  ctx: FixContext,
): Array<{ fhirpath: string; before: string; after: string; safe: boolean }> {
  const applied: Array<{ fhirpath: string; before: string; after: string; safe: boolean }> = [];
  const identifiers = (resource as { identifier?: Array<Record<string, unknown>> }).identifier;
  if (!Array.isArray(identifiers)) return applied;
  identifiers.forEach((id, idx) => {
    const system = typeof id.system === "string" ? id.system : "";
    if (!/example\.com|v2-to-fhir-converter/i.test(system)) return;
    const authority =
      system.split("/").filter(Boolean).pop() ??
      (id.type as { coding?: Array<{ code?: string }> } | undefined)?.coding?.[0]?.code ??
      "";
    const mapped = lookupMapping(ctx, "authority_to_system", authority);
    if (mapped) {
      id.system = mapped.targetValue;
      applied.push({ fhirpath: `Patient.identifier[${idx}].system`, before: system, after: mapped.targetValue, safe: true });
    } else if (authority) {
      ctx.suggestions.push({
        type: "authority_to_system",
        sourceValue: authority,
        targetValue: `urn:fhirfix:unmapped:${authority.toLowerCase()}`,
        targetSystem: null,
        confidence: 40,
        reason: `Authority "${authority}" appeared with a placeholder identifier system and has no registry entry.`,
      });
    }
  });
  return applied;
}

const DERIVERS = [
  deriveIdentifierTypeSystem,
  deriveIdentifierSystem,
  deriveDateReformat,
  deriveGender,
] as const;

// derive a fix for one finding. returns undefined when no deriver applies (the
// finding stays manual). the identifier-system deriver needs ctx; others ignore it.
export function deriveFix(
  resource: unknown,
  finding: EngineFinding,
  ctx: FixContext,
): DerivedFix | undefined {
  for (const deriver of DERIVERS) {
    const fix =
      deriver === deriveIdentifierSystem
        ? deriveIdentifierSystem(resource, finding, ctx)
        : (deriver as (r: unknown, f: EngineFinding) => DerivedFix | undefined)(resource, finding);
    if (fix) return fix;
  }
  return undefined;
}
