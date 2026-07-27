import { type RemediationResult, runRemediation, SidecarError } from "@shared/engine";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, schema } from "@/lib/db";
import { DEMO_SAMPLES } from "@/lib/demo-samples";
import { engineDeps, ensureEngineWarm } from "@/lib/engine";
import { logger } from "@/lib/logger";
import { redactPhi } from "@/lib/phi";
import { rateLimit, redis } from "@/lib/redis";

const DEMO_MAX_BYTES = 50_000;
const DEMO_RATE_LIMIT = 20; // requests
const DEMO_RATE_WINDOW = 60 * 60; // per hour, per ip
const DEMO_CACHE_TTL = 60 * 30; // cache a precomputed result for 30 min

export const publicRoutes = new Hono();

function clientIp(headerVal: string | undefined): string {
  return headerVal?.split(",")[0]?.trim() ?? "unknown";
}

// the pre-broken sample library the playground offers.
publicRoutes.get("/api/demo/samples", (c) =>
  c.json({
    samples: DEMO_SAMPLES.map((s) => ({
      id: s.id,
      label: s.label,
      kind: s.kind,
      description: s.description,
      content: s.content,
    })),
  }),
);

publicRoutes.post("/api/demo/fix", async (c) => {
  const ip = clientIp(c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip"));
  const rl = await rateLimit(`demo:${ip}`, DEMO_RATE_LIMIT, DEMO_RATE_WINDOW);
  if (!rl.allowed) {
    return c.json(
      { error: "rate_limited", message: "Too many demo runs. Try again in a bit, or sign up." },
      429,
    );
  }

  let body: { content?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request", message: "Invalid JSON body." }, 400);
  }
  const content = typeof body.content === "string" ? body.content : "";
  if (!content.trim()) {
    return c.json({ error: "bad_request", message: "content is required." }, 400);
  }
  if (new TextEncoder().encode(content).length > DEMO_MAX_BYTES) {
    return c.json(
      { error: "too_large", message: "Demo input is capped. Sign up to run larger files." },
      413,
    );
  }

  // cache by content so the fixed samples are instant and repeated abuse is cheap.
  const hash = Bun.hash(content).toString(16);
  const cacheKey = `demo:result:${hash}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json({ ...JSON.parse(cached), cached: true });
  }

  try {
    await ensureEngineWarm();
    const result = await runRemediation(
      {
        raw: content,
        mappings: [
          {
            type: "authority_to_system",
            sourceValue: "SIMULATOR-MRN",
            targetValue: "http://northwind-health.org/fhir/sid/mrn",
            targetSystem: null,
            status: "active",
          },
        ],
        autoFix: true,
      },
      engineDeps,
    );
    const payload = demoPayload(result);
    await redis.set(cacheKey, JSON.stringify(payload), "EX", DEMO_CACHE_TTL);
    return c.json({ ...payload, cached: false });
  } catch (err) {
    const detail =
      err instanceof SidecarError ? `${err.sidecar} unavailable` : "The demo engine is busy.";
    logger.error("demo.fix", err instanceof Error ? err.message : String(err));
    return c.json({ error: "engine_error", message: detail }, 503);
  }
});

function demoPayload(result: RemediationResult) {
  return {
    inputType: result.inputType,
    resourceCount: result.resourceCount,
    scoreBefore: result.conformanceScoreBefore,
    scoreAfter: result.conformanceScoreAfter,
    reVerifiedClean: result.reVerifiedClean,
    findingsTotal: result.findingsTotal,
    findingsAutoFixable: result.findingsAutoFixable,
    findings: result.findings.map((f) => ({
      severity: f.severity,
      category: f.category,
      fhirpath: f.fhirpath ?? null,
      plainMessage: f.plainMessage,
      suggestedFix: f.suggestedFix,
      fixStatus: f.fixStatus,
      fixConfidence: f.fixConfidence,
      occurrenceCount: f.occurrenceCount,
    })),
    corrected: JSON.stringify(redactPhi(result.correctedResource), null, 2),
  };
}

publicRoutes.get("/api/share/:token", async (c) => {
  const token = c.req.param("token");
  const [share] = await db
    .select()
    .from(schema.reportShare)
    .where(eq(schema.reportShare.token, token))
    .limit(1);

  if (!share) return c.json({ error: "not_found" }, 404);
  if (share.revokedAt) return c.json({ error: "revoked", state: "revoked" }, 410);
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    return c.json({ error: "expired", state: "expired" }, 410);
  }

  const [run] = await db.select().from(schema.run).where(eq(schema.run.id, share.runId)).limit(1);
  if (!run) return c.json({ error: "not_found" }, 404);

  const findings = await db
    .select()
    .from(schema.finding)
    .where(eq(schema.finding.runId, share.runId))
    .orderBy(desc(schema.finding.rank));

  // bump the view count. best-effort; a failed increment never blocks the read.
  await db
    .update(schema.reportShare)
    .set({ viewCount: share.viewCount + 1 })
    .where(eq(schema.reportShare.token, token))
    .catch(() => {});

  return c.json({
    run: {
      id: run.id,
      inputType: run.inputType,
      status: run.status,
      scoreBefore: run.conformanceScoreBefore,
      scoreAfter: run.conformanceScoreAfter,
      findingsTotal: run.findingsTotal,
      findingsAutoFixable: run.findingsAutoFixable,
      resourceCount: run.resourceCount,
      createdAt: run.createdAt,
    },
    redacted: share.redacted,
    findings: findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      category: f.category,
      fhirpath: f.fhirpath,
      resourceType: f.resourceType,
      plainMessage: f.plainMessage,
      suggestedFix: f.suggestedFix,
      fixStatus: f.fixStatus,
      fixConfidence: f.fixConfidence,
      occurrenceCount: f.occurrenceCount,
      ruleSource: f.ruleSource,
      specCitation: f.specCitation,
      rawValidatorMessage: "",
      dedupFingerprint: f.dedupFingerprint,
      rank: f.rank,
    })),
  });
});
