
import { createHash } from "node:crypto";

export function stripIndices(fhirpath: string | undefined): string {
  if (!fhirpath) return "";
  return fhirpath.replace(/\[\d+\]/g, "");
}

export function fingerprint(parts: {
  ruleSource: string;
  category: string;
  resourceType?: string;
  fhirpath?: string;
}): string {
  const normalized = [
    parts.category,
    parts.ruleSource,
    parts.resourceType ?? "",
    stripIndices(parts.fhirpath),
  ].join("|");
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}
