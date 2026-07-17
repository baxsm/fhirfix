import { deriveFix, type FixContext } from "./fixes";
import { normalizeOutcome, rankScore } from "./normalize";
import { collectResources, scoreFrom, validateAll } from "./remediate";
import type { EngineFinding, RegistryMapping } from "./types";
import type { EngineDeps } from "./remediate";

export interface ApplyFixInput {
  // the current corrected artifact (JSON string) to apply the fix on top of.
  corrected: string;
  // dedup fingerprints to apply. one for a single Apply, many for apply-all-safe.
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

// apply one or more specific (already-derived) fixes on top of the current
// corrected artifact, then re-validate. this powers one-click Apply and
// apply-all-safe from the report: the run already ran once, the user is now
// applying a fix the engine flagged as suggested/safe. deterministic, no LLM.
export async function applyFixes(input: ApplyFixInput, deps: EngineDeps): Promise<ApplyFixResult> {
  const parsed = JSON.parse(input.corrected);
  const corrected = structuredClone(parsed);
  const resources = collectResources(corrected);

  // re-validate the current corrected artifact so we know which findings still
  // exist and can re-derive their fixes against the live resource state.
  const before = await validateAll(deps, resources, input.profiles);
  const openFindings = normalizeOutcome(before.outcome);

  const ctx: FixContext = { mappings: input.mappings, suggestions: [] };
  const wanted = new Set(input.fingerprints);
  const applied: string[] = [];

  for (const finding of openFindings) {
    if (!wanted.has(finding.dedupFingerprint)) continue;
    for (const resource of resources) {
      const fix = deriveFix(resource, finding, ctx);
      // only safe fixes are applied here; an unsafe fix reaching this path is a
      // caller bug (the UI gates them), so we skip rather than mutate.
      if (!fix || !fix.safe) continue;
      const ok = fix.apply(resource);
      if (ok) {
        applied.push(finding.dedupFingerprint);
        break;
      }
    }
  }

  const skipped = input.fingerprints.filter((fp) => !applied.includes(fp));

  // re-verify the mutated resources and re-derive confidence for the report.
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
  // the finding the user asked AI to help with. carries the plain message +
  // raw validator message so the model has the full context.
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
  // the model's proposed patch, applied and re-verified. null when the model
  // declined or the patch did not validate cleanly (we never silently ship a
  // worse resource).
  applied: boolean;
  correctedResource: unknown;
  findings: EngineFinding[];
  conformanceScoreAfter: number;
  explanation: string; // plain-language rationale from the model, always returned
  patchPath: string | null;
  reVerifiedClean: boolean;
}

interface OpenRouterMessage {
  role: "system" | "user";
  content: string;
}

// ask an LLM (OpenRouter Gemini Flash) to propose a JSON-pointer-style patch for
// one finding the deterministic engine could not safely auto-fix. this is the
// softer "Fix with AI" hand-off: it never claims certainty, and the patch is only
// kept if re-validation shows the resource is no worse. real API call, no mock.
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

  // apply the proposed patch on a clone, re-validate, and only keep it if the
  // score did not regress. the model is subordinate: it never makes things worse.
  const candidate = structuredClone(parsed);
  const { setAtPath } = await import("./fhir-path");
  for (const resource of collectResources(candidate)) {
    if (setAtPath(resource, patch.path, patch.value)) break;
  }
  const candidateResources = collectResources(candidate);
  const afterOutcome = await validateAll(deps, candidateResources, input.profiles);
  const afterFindings = normalizeOutcome(afterOutcome.outcome);
  // same scale as beforeScore or the "never makes things worse" check is meaningless.
  const afterScore = scoreFrom(afterFindings, candidateResources.length);

  if (afterScore < beforeScore) {
    // the patch made it worse; discard, report the original.
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
