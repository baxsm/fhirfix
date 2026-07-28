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
