import { hl7RootTemplate } from "./converter-client";
import { detectInput } from "./detect";
import { deriveFix, type FixContext, remapPlaceholderSystems } from "./fixes";
import { fingerprint } from "./fingerprint";
import { normalizeOutcome, rankScore } from "./normalize";
import { profileFor, profilesForResource } from "./profiles";
import type {
  EngineFinding,
  MappingSuggestion,
  OperationOutcome,
  RegistryMapping,
  RemediationResult,
} from "./types";
import type { ConverterClient } from "./converter-client";
import type { ValidatorPool } from "./validator-client";

export const ENGINE_VERSION = "0.2.0";

export interface RemediationInput {
  raw: string;
  mappings: RegistryMapping[];
  profiles?: string[]; // explicit profile overrides; otherwise auto per resourceType
  autoFix?: boolean; // apply safe fixes and re-verify (default true)
}

export interface EngineDeps {
  validator: ValidatorPool;
  converter: ConverterClient;
}

export function collectResources(parsed: unknown): unknown[] {
  if (!parsed || typeof parsed !== "object") return [];
  const obj = parsed as { resourceType?: string; entry?: Array<{ resource?: unknown }> };
  if (obj.resourceType === "Bundle") {
    return (obj.entry ?? []).map((e) => e.resource).filter((r): r is unknown => r != null);
  }
  return [obj];
}

export function scoreFrom(findings: EngineFinding[], resourceCount = 1): number {
  let penalty = 0;
  for (const f of findings) {
    const per = f.severity === "error" ? 120 : f.severity === "warning" ? 30 : 5;
    penalty += per * Math.min(f.occurrenceCount, 20);
  }
  const scale = Math.max(1, resourceCount);
  return Math.max(0, Math.round(1000 - penalty / scale));
}

export async function validateAll(
  deps: EngineDeps,
  resources: unknown[],
  explicitProfiles: string[] | undefined,
): Promise<{ outcome: OperationOutcome; profilesApplied: string[] }> {
  const issues: OperationOutcome["issue"] = [];
  const profilesApplied = new Set<string>();
  for (const resource of resources) {
    const rt = (resource as { resourceType?: string }).resourceType ?? "";
    const profiles =
      explicitProfiles && explicitProfiles.length > 0
        ? profilesForResource(rt, explicitProfiles)
        : [profileFor(rt)].filter((p): p is string => Boolean(p));
    for (const p of profiles) profilesApplied.add(p);
    const oo = await deps.validator.validate(resource, profiles);
    for (const issue of oo.issue ?? []) issues.push(issue);
  }
  return {
    outcome: { resourceType: "OperationOutcome", issue: issues },
    profilesApplied: [...profilesApplied],
  };
}

export async function runRemediation(
  input: RemediationInput,
  deps: EngineDeps,
): Promise<RemediationResult> {
  const autoFix = input.autoFix ?? true;
  const detected = detectInput(input.raw);

  // 1. convert HL7v2/C-CDA to FHIR; FHIR passes through.
  let parsed: unknown;
  if (detected.inputType === "hl7v2") {
    const template = hl7RootTemplate(input.raw);
    parsed = await deps.converter.convert(input.raw, "Hl7v2", template);
  } else if (detected.parsed !== undefined) {
    parsed = detected.parsed;
  } else {
    parsed = JSON.parse(input.raw); // may throw; caller treats as a failed run
  }

  const resources = collectResources(parsed);

  // 2. validate the naive resources.
  const before = await validateAll(deps, resources, input.profiles);
  const naiveFindings = normalizeOutcome(before.outcome);

  // 3. derive fixes for each finding against the registry.
  const ctx: FixContext = { mappings: input.mappings, suggestions: [] };
  const suggestions: MappingSuggestion[] = ctx.suggestions;

  // work on a deep clone so the original input is never mutated.
  const corrected = structuredClone(parsed);
  const correctedResources = collectResources(corrected);

  const proactiveApplied: EngineFinding[] = [];
  if (autoFix) {
    for (const resource of correctedResources) {
      const remapped = remapPlaceholderSystems(resource, ctx);
      for (const r of remapped) {
        const fp = fingerprint({ ruleSource: "fhirfix.placeholder-system", category: "structural", resourceType: "Patient", fhirpath: r.fhirpath });
        proactiveApplied.push({
          severity: "warning",
          category: "structural",
          ruleSource: "fhirfix.placeholder-system",
          specCitation: "fhirfix.placeholder-system",
          resourceType: "Patient",
          fhirpath: r.fhirpath,
          rawValidatorMessage: `Identifier system "${r.before}" is a non-resolvable placeholder emitted by the v2 converter.`,
          plainMessage: `The identifier system was a placeholder (${r.before}). Replaced it with the registered real system.`,
          suggestedFix: `Set the identifier system to ${r.after}.`,
          fixConfidence: "auto",
          fixStatus: "applied",
          dedupFingerprint: fp,
          occurrenceCount: 1,
          rank: rankScore("warning", "auto", 1),
        });
      }
    }
  }

  const scoreBefore = scoreFrom([...naiveFindings, ...proactiveApplied], resources.length);

  let autoFixApplied = proactiveApplied.length > 0;
  for (const finding of naiveFindings) {
    // try each corrected resource until a deriver produces a fix for this path.
    for (const resource of correctedResources) {
      const fix = deriveFix(resource, finding, ctx);
      if (!fix) continue;
      finding.fixConfidence = fix.confidence;
      finding.suggestedFix = fix.suggestedFix;
      if (fix.safe && autoFix) {
        const ok = fix.apply(resource);
        if (ok) {
          finding.fixStatus = "applied";
          autoFixApplied = true;
        } else {
          finding.fixStatus = fix.confidence === "manual" ? "manual_needed" : "suggested";
        }
      } else {
        finding.fixStatus = fix.safe ? "suggested" : "manual_needed";
      }
      break;
    }
    // re-rank now that confidence is known.
    finding.rank = rankScore(finding.severity, finding.fixConfidence, finding.occurrenceCount);
  }
  naiveFindings.sort((a, b) => b.rank - a.rank);

  // 4. re-verify the corrected resources.
  let finalFindings = naiveFindings;
  let scoreAfter = scoreBefore;
  let reVerifiedClean = false;
  if (autoFixApplied) {
    const after = await validateAll(deps, correctedResources, input.profiles);
    finalFindings = normalizeOutcome(after.outcome);
    // re-derive confidence on the remaining findings so the report tiers them.
    const ctx2: FixContext = { mappings: input.mappings, suggestions: [] };
    for (const f of finalFindings) {
      for (const resource of correctedResources) {
        const fix = deriveFix(resource, f, ctx2);
        if (fix) {
          f.fixConfidence = fix.confidence;
          f.suggestedFix = fix.suggestedFix;
          f.fixStatus = fix.safe ? "suggested" : "manual_needed";
          break;
        }
      }
      f.rank = rankScore(f.severity, f.fixConfidence, f.occurrenceCount);
    }
    finalFindings.sort((a, b) => b.rank - a.rank);
    scoreAfter = scoreFrom(finalFindings, resources.length);
    reVerifiedClean = finalFindings.filter((f) => f.severity === "error").length === 0;
  } else {
    reVerifiedClean = naiveFindings.filter((f) => f.severity === "error").length === 0;
  }

  const reported = autoFixApplied
    ? mergeAppliedInto([...proactiveApplied, ...naiveFindings], finalFindings)
    : [...proactiveApplied, ...naiveFindings].sort((a, b) => b.rank - a.rank);

  return {
    inputType: detected.inputType,
    fhirVersion: detected.fhirVersion,
    profilesApplied: before.profilesApplied,
    resourceCount: resources.length,
    conformanceScoreBefore: scoreBefore,
    conformanceScoreAfter: scoreAfter,
    autoFixApplied,
    findings: reported,
    findingsTotal: reported.length,
    findingsAutoFixable: reported.filter((f) => f.fixConfidence === "auto").length,
    suggestions,
    correctedResource: corrected,
    reVerifiedClean,
  };
}

function mergeAppliedInto(
  naive: EngineFinding[],
  remaining: EngineFinding[],
): EngineFinding[] {
  const remainingFps = new Set(remaining.map((f) => f.dedupFingerprint));
  const applied = naive.filter(
    (f) => f.fixStatus === "applied" && !remainingFps.has(f.dedupFingerprint),
  );
  return [...applied, ...remaining].sort((a, b) => b.rank - a.rank);
}
