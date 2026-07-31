import { getRun, getRunFindings } from "@shared/db/runs";
import type { Context } from "hono";
import { writeAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  type ReportBundle,
  toJsonReport,
  toOperationOutcome,
  toPdfReport,
} from "@/lib/report-export";
import type { ApiV1Env } from "./context";
import { apiError } from "./middleware";

export async function getReportController(c: Context<ApiV1Env>) {
  const workspaceId = c.get("workspaceId");
  const runId = c.req.param("id") ?? "";
  const format = new URL(c.req.url).searchParams.get("format") ?? "json";

  const run = await getRun(db, workspaceId, runId);
  if (!run) {
    return apiError(c, 404, "not_found", "Run not found.");
  }

  if (format !== "json" && format !== "operationoutcome" && format !== "pdf") {
    return apiError(c, 400, "unknown_format", "format must be json, operationoutcome, or pdf.");
  }

  const findings = await getRunFindings(db, runId);

  // same action the dashboard export writes. the actor is the key, not a person.
  await writeAudit({
    workspaceId,
    action: "report.exported",
    actorType: "api_key",
    actorId: c.get("apiKeyId"),
    targetRef: runId,
    ip: c.get("ip") || null,
    metadata: { format, via: "api" },
  });

  const bundle: ReportBundle = { run, findings, profilesApplied: run.profilesApplied };

  if (format === "json") {
    return new Response(toJsonReport(bundle), { headers: { "Content-Type": "application/json" } });
  }
  if (format === "operationoutcome") {
    return new Response(toOperationOutcome(bundle), {
      headers: { "Content-Type": "application/fhir+json" },
    });
  }
  return new Response(toPdfReport(bundle), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${runId}.report.pdf"`,
    },
  });
}
