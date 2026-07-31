import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { auth } from "@/auth/auth";
import { ipFromHeaders, writeAudit } from "@/lib/audit";
import { blobStore } from "@/lib/blob";
import { db, schema } from "@/lib/db";
import {
  type ReportBundle,
  toJsonReport,
  toOperationOutcome,
  toPdfReport,
} from "@/lib/report-export";

export const exportRoutes = new Hono();

// resolve session -> membership for a run. returns the run bundle or a status.
async function authorizeRun(
  headers: Headers,
  runId: string,
): Promise<
  | {
      ok: true;
      bundle: ReportBundle;
      correctedRef: string | null;
      workspaceId: string;
      userId: string;
    }
  | { ok: false; status: 401 | 403 | 404 }
> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return { ok: false, status: 401 };

  const [run] = await db.select().from(schema.run).where(eq(schema.run.id, runId)).limit(1);
  if (!run) return { ok: false, status: 404 };

  const [membership] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, run.workspaceId),
        eq(schema.member.userId, session.user.id),
      ),
    )
    .limit(1);
  if (!membership) return { ok: false, status: 403 };

  const findings = await db
    .select()
    .from(schema.finding)
    .where(eq(schema.finding.runId, runId))
    .orderBy(desc(schema.finding.rank));

  return {
    ok: true,
    correctedRef: run.correctedRef,
    workspaceId: run.workspaceId,
    userId: session.user.id,
    bundle: { run, findings, profilesApplied: run.profilesApplied },
  };
}

// GET /api/runs/:runId/export/:format  (json | operation-outcome | pdf)
exportRoutes.get("/api/runs/:runId/export/:format", async (c) => {
  const runId = c.req.param("runId");
  const format = c.req.param("format");
  const res = await authorizeRun(c.req.raw.headers, runId);
  if (!res.ok) return c.json({ error: "unauthorized" }, res.status);
  if (format !== "json" && format !== "operation-outcome" && format !== "pdf") {
    return c.json({ error: "unknown_format" }, 400);
  }

  // a report carries findings from the source data, so taking one out of the
  // product is an auditable read, not just a render.
  await writeAudit({
    workspaceId: res.workspaceId,
    action: "report.exported",
    actorType: "user",
    actorId: res.userId,
    targetRef: runId,
    ip: ipFromHeaders(c.req.raw.headers),
    metadata: { format },
  });

  if (format === "json") {
    return new Response(toJsonReport(res.bundle), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${runId}.report.json"`,
      },
    });
  }
  if (format === "operation-outcome") {
    return new Response(toOperationOutcome(res.bundle), {
      headers: {
        "Content-Type": "application/fhir+json",
        "Content-Disposition": `attachment; filename="${runId}.operation-outcome.json"`,
      },
    });
  }
  const bytes = toPdfReport(res.bundle);
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${runId}.report.pdf"`,
    },
  });
});

exportRoutes.get("/api/runs/:runId/corrected", async (c) => {
  const runId = c.req.param("runId");
  const res = await authorizeRun(c.req.raw.headers, runId);
  if (!res.ok) return c.json({ error: "unauthorized" }, res.status);
  if (!res.correctedRef) return c.json({ error: "no_artifact" }, 404);
  const body = await blobStore.get(res.correctedRef).catch(() => null);
  if (body == null) return c.json({ error: "no_artifact" }, 404);
  return new Response(body, { headers: { "Content-Type": "application/octet-stream" } });
});

// GET /api/runs/:runId/download  -> the corrected artifact as a real download.
exportRoutes.get("/api/runs/:runId/download", async (c) => {
  const runId = c.req.param("runId");
  const res = await authorizeRun(c.req.raw.headers, runId);
  if (!res.ok) return c.json({ error: "unauthorized" }, res.status);
  if (!res.correctedRef) return c.json({ error: "no_artifact" }, 404);
  const body = await blobStore.get(res.correctedRef).catch(() => null);
  if (body == null) return c.json({ error: "no_artifact" }, 404);

  // the corrected artifact is the source data itself, so this is the download
  // an auditor most wants to see. only audited once the bytes actually exist.
  await writeAudit({
    workspaceId: res.workspaceId,
    action: "report.downloaded",
    actorType: "user",
    actorId: res.userId,
    targetRef: runId,
    ip: ipFromHeaders(c.req.raw.headers),
    metadata: { kind: "corrected_artifact" },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/fhir+json",
      "Content-Disposition": `attachment; filename="${runId}.corrected.json"`,
    },
  });
});
