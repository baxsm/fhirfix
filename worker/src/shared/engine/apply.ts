import { setAtPath } from "./fhir-path";
import { deriveFix, type FixContext } from "./fixes";
import { normalizeOutcome, rankScore } from "./normalize";
import { collectResources, type EngineDeps, scoreFrom, validateAll } from "./remediate";
import type { EngineFinding, RegistryMapping } from "./types";

export interface ApplyFixInput {
  corrected: string;
  fingerprints: string[];
  mappings: RegistryMapping[];
  profiles?: string[];
}

export interface ApplyFixResult {
  correctedResource: unknown;
  findings: EngineFinding[];
  conformanceScoreAfter: number;
  appliedFingerprints: string[];
  skippedFingerprints: string[]; // requested but no safe deriver matched
  reVerifiedClean: boolean;
}

// deterministic, no LLM. powers one-click Apply and apply-all-safe.
export async function applyFixes(input: ApplyFixInput, deps: EngineDeps): Promise<ApplyFixResult> {
  const parsed = JSON.parse(input.corrected);
  const corrected = structuredClone(parsed);
  const resources = collectResources(corrected);

  // re-validate first so fixes are derived against the live resource state
  const before = await validateAll(deps, resources, input.profiles);
  const openFindings = normalizeOutcome(before.outcome);

  const ctx: FixContext = { mappings: input.mappings, suggestions: [] };
  const wanted = new Set(input.fingerprints);
  const applied: string[] = [];

  for (const finding of openFindings) {
    if (!wanted.has(finding.dedupFingerprint)) continue;
    for (const resource of resources) {
      const fix = deriveFix(resource, finding, ctx);
      // an unsafe fix reaching here is a caller bug (the UI gates them); skip, never mutate
      if (!fix || !fix.safe) continue;
      const ok = fix.apply(resource);
      if (ok) {
        applied.push(finding.dedupFingerprint);
        break;
      }
    }
  }

  const skipped = input.fingerprints.filter((fp) => !applied.includes(fp));

  const after = await validateAll(deps, resources, input.profiles);
  const finalFindings = normalizeOutcome(after.outcome);
  const ctx2: FixContext = { mappings: input.mappings, suggestions: [] };
  for (const f of finalFindings) {
    for (const resource of resources) {
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

  return {
    correctedResource: corrected,
    findings: finalFindings,
    conformanceScoreAfter: scoreFrom(finalFindings, resources.length),
    appliedFingerprints: applied,
    skippedFingerprints: skipped,
    reVerifiedClean: finalFindings.filter((f) => f.severity === "error").length === 0,
  };
}

export interface AiFixInput {
  corrected: string;
  fingerprint: string;
  finding: {
    fhirpath: string | null;
    plainMessage: string;
    rawValidatorMessage: string;
    resourceType: string | null;
  };
  mappings: RegistryMapping[];
  profiles?: string[];
  apiKey: string;
  model: string;
}

export interface AiFixResult {
  // false when the model declined or its patch scored worse than the original
  applied: boolean;
  correctedResource: unknown;
  findings: EngineFinding[];
  conformanceScoreAfter: number;
  explanation: string;
  patchPath: string | null;
  reVerifiedClean: boolean;
}

interface OpenRouterMessage {
  role: "system" | "user";
  content: string;
}

// for findings the deterministic engine could not safely auto-fix
export async function fixWithAi(input: AiFixInput, deps: EngineDeps): Promise<AiFixResult> {
  const parsed = JSON.parse(input.corrected);
  const beforeResources = collectResources(parsed);
  const before = await validateAll(deps, beforeResources, input.profiles);
  const beforeScore = scoreFrom(normalizeOutcome(before.outcome), beforeResources.length);

  const system: OpenRouterMessage = {
    role: "system",
    content:
      "You are a FHIR R4 / US Core conformance assistant. You are given one FHIR resource (or Bundle) and one validator finding. " +
      "Propose the smallest change that makes the resource conformant WITHOUT changing clinical meaning. " +
      'Reply with strict JSON only: {"path": "<FHIRPath to set>", "value": <the JSON value to set at that path>, "explanation": "<one plain sentence>"}. ' +
      'If you cannot fix it safely, reply {"path": null, "value": null, "explanation": "<why>"}.',
  };
  const user: OpenRouterMessage = {
    role: "user",
    content: JSON.stringify({
      finding: {
        path: input.finding.fhirpath,
        problem: input.finding.plainMessage,
        validatorMessage: input.finding.rawValidatorMessage,
        resourceType: input.finding.resourceType,
      },
      resource: parsed,
    }),
  };

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: [system, user],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`openrouter ${res.status}: ${detail.slice(0, 300)}`);
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content ?? "{}";
  let patch: { path: string | null; value: unknown; explanation?: string };
  try {
    patch = JSON.parse(content);
  } catch {
    // some models wrap JSON in prose; pull the first {...} block.
    const m = content.match(/\{[\s\S]*\}/);
    patch = m ? JSON.parse(m[0]) : { path: null, value: null };
  }

  const explanation = patch.explanation ?? "The assistant did not return a rationale.";

  if (!patch.path) {
    const findings = normalizeOutcome(before.outcome);
    return {
      applied: false,
      correctedResource: parsed,
      findings,
      conformanceScoreAfter: beforeScore,
      explanation,
      patchPath: null,
      reVerifiedClean: findings.filter((f) => f.severity === "error").length === 0,
    };
  }

  // only keep the patch if the score did not regress
  const candidate = structuredClone(parsed);
  for (const resource of collectResources(candidate)) {
    if (setAtPath(resource, patch.path, patch.value)) break;
  }
  const candidateResources = collectResources(candidate);
  const afterOutcome = await validateAll(deps, candidateResources, input.profiles);
  const afterFindings = normalizeOutcome(afterOutcome.outcome);
  // must use the same scale as beforeScore or the regression check is meaningless
  const afterScore = scoreFrom(afterFindings, candidateResources.length);

  if (afterScore < beforeScore) {
    const findings = normalizeOutcome(before.outcome);
    return {
      applied: false,
      correctedResource: parsed,
      findings,
      conformanceScoreAfter: beforeScore,
      explanation: `${explanation} (Discarded: the proposed change did not improve conformance.)`,
      patchPath: patch.path,
      reVerifiedClean: findings.filter((f) => f.severity === "error").length === 0,
    };
  }

  return {
    applied: true,
    correctedResource: candidate,
    findings: afterFindings,
    conformanceScoreAfter: afterScore,
    explanation,
    patchPath: patch.path,
    reVerifiedClean: afterFindings.filter((f) => f.severity === "error").length === 0,
  };
}
