// a stable, deterministic fingerprint so the same defect across many resources
// collapses to one finding row with an occurrence count. we intentionally strip
// array indices from the fhirpath (identifier[0] and identifier[3] are the same
// defect class) and hash the rule + normalized path + resource type.

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
