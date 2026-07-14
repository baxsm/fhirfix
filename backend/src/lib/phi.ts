// PHI heuristics for FHIR resources. used to (1) block/redact share links so an
// unauthenticated /share URL never leaks patient data, and (2) redact demo inputs.
// this is a conservative surface scan of the fields that carry direct identifiers,
// not a full de-identification (that is the redaction-policy engine's job later).

// fields that carry direct patient identifiers when they sit on a patient-context
// resource. an Organization.name is not PHI, so this is applied per-resource-type.
const PHI_KEYS = new Set([
  "name",
  "telecom",
  "address",
  "birthDate",
  "photo",
  "contact",
  "communication",
]);

// resources that describe a person; PHI fields on these are patient data.
const PERSON_RESOURCES = new Set(["Patient", "RelatedPerson", "Person"]);

const REDACTION_MARKER = "[redacted]";

interface Identifier {
  value?: unknown;
  system?: unknown;
}

// walk every resource in a value (a single resource, a Bundle, or a nested tree)
// and hand each one to `fn` along with its resourceType.
function forEachResource(node: unknown, fn: (resource: Record<string, unknown>) => void): void {
  if (node == null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) forEachResource(item, fn);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj.resourceType === "string") fn(obj);
  // bundle entries carry nested resources.
  if (Array.isArray(obj.entry)) {
    for (const entry of obj.entry) {
      if (entry && typeof entry === "object") {
        forEachResource((entry as { resource?: unknown }).resource, fn);
      }
    }
  }
  // contained resources.
  if (Array.isArray(obj.contained)) forEachResource(obj.contained, fn);
}

function isRedacted(v: unknown): boolean {
  return v === REDACTION_MARKER;
}

// does this resource (or bundle) carry un-redacted direct patient identifiers?
export function containsPhi(resource: unknown): boolean {
  let found = false;
  forEachResource(resource, (r) => {
    if (found) return;
    // identifier values are PHI on any resource type (MRN, SSN).
    if (Array.isArray(r.identifier)) {
      for (const id of r.identifier as Identifier[]) {
        if (id && id.value != null && !isRedacted(id.value)) {
          found = true;
          return;
        }
      }
    }
    // name/telecom/address/etc. are PHI only on person-context resources.
    if (!PERSON_RESOURCES.has(r.resourceType as string)) return;
    for (const key of PHI_KEYS) {
      const v = r[key];
      if (v == null || isRedacted(v)) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      found = true;
      return;
    }
  });
  return found;
}

// return a deep clone with direct identifiers scrubbed. structure, codes, and
// conformance-relevant fields survive so the report still makes sense; names,
// contacts, addresses, and identifier values are replaced with a redaction marker.
export function redactPhi(resource: unknown): unknown {
  const clone = structuredClone(resource);
  forEachResource(clone, (r) => {
    // scrub identifier values on any resource.
    if (Array.isArray(r.identifier)) {
      for (const id of r.identifier as Record<string, unknown>[]) {
        if (id && "value" in id) id.value = REDACTION_MARKER;
      }
    }
    // scrub person fields only on person-context resources.
    if (!PERSON_RESOURCES.has(r.resourceType as string)) return;
    for (const key of PHI_KEYS) {
      if (r[key] != null) r[key] = REDACTION_MARKER;
    }
  });
  return clone;
}
