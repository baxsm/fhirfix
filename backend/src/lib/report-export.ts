import type { Finding, Run } from "@shared/db/schema";

export interface ReportBundle {
  run: Pick<
    Run,
    | "id"
    | "inputType"
    | "status"
    | "conformanceScoreBefore"
    | "conformanceScoreAfter"
    | "findingsTotal"
    | "findingsAutoFixable"
    | "resourceCount"
    | "engineVersion"
    | "createdAt"
    | "completedAt"
  >;
  findings: Finding[];
  profilesApplied: string[];
}

// the canonical JSON report. stable field order, no db internals leaked.
export function toJsonReport(bundle: ReportBundle): string {
  const { run, findings, profilesApplied } = bundle;
  return JSON.stringify(
    {
      report: "fhirfix.remediation",
      version: 1,
      run: {
        id: run.id,
        inputType: run.inputType,
        status: run.status,
        engineVersion: run.engineVersion,
        resourceCount: run.resourceCount,
        profilesApplied,
        conformanceScore: {
          before: run.conformanceScoreBefore,
          after: run.conformanceScoreAfter,
        },
        findings: {
          total: run.findingsTotal,
          autoFixable: run.findingsAutoFixable,
        },
        createdAt: run.createdAt,
        completedAt: run.completedAt,
      },
      findings: findings.map((f) => ({
        severity: f.severity,
        category: f.category,
        fhirpath: f.fhirpath,
        resourceType: f.resourceType,
        message: f.plainMessage,
        suggestedFix: f.suggestedFix,
        fixStatus: f.fixStatus,
        fixConfidence: f.fixConfidence,
        occurrenceCount: f.occurrenceCount,
        ruleSource: f.ruleSource,
        specCitation: f.specCitation,
      })),
    },
    null,
    2,
  );
}

export function toOperationOutcome(bundle: ReportBundle): string {
  const severityMap: Record<string, string> = {
    error: "error",
    warning: "warning",
    info: "information",
  };
  return JSON.stringify(
    {
      resourceType: "OperationOutcome",
      id: bundle.run.id,
      issue: bundle.findings.map((f) => ({
        severity: severityMap[f.severity] ?? "information",
        code: f.category === "terminology" ? "code-invalid" : "invariant",
        details: { text: f.plainMessage },
        diagnostics: f.suggestedFix,
        ...(f.fhirpath ? { expression: [f.fhirpath] } : {}),
      })),
    },
    null,
    2,
  );
}

// escape a string for a PDF text literal.
function pdfEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

// wrap a long line to fit the page width (rough char budget for Helvetica 10pt).
function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (`${cur} ${w}`.trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = `${cur} ${w}`.trim();
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export function toPdfReport(bundle: ReportBundle): Uint8Array {
  const { run, findings } = bundle;
  const lines: Array<{ text: string; size: number; gap: number }> = [];
  lines.push({ text: "FHIRfix conformance report", size: 18, gap: 26 });
  lines.push({ text: `Run ${run.id}`, size: 10, gap: 16 });
  lines.push({
    text: `Score ${run.conformanceScoreBefore ?? "-"} -> ${run.conformanceScoreAfter ?? "-"}   |   ${run.findingsTotal} findings, ${run.findingsAutoFixable} auto-fixable`,
    size: 11,
    gap: 22,
  });

  for (const f of findings.slice(0, 40)) {
    const head = `[${f.severity.toUpperCase()}] ${f.fhirpath ?? f.resourceType ?? ""}`;
    lines.push({ text: head, size: 10, gap: 14 });
    for (const l of wrap(f.plainMessage, 92)) lines.push({ text: l, size: 9, gap: 12 });
    lines.push({ text: "", size: 9, gap: 6 });
  }

  // build the content stream, top-down from y=780.
  let y = 780;
  let content = "BT\n";
  for (const l of lines) {
    if (y < 40) break; // one page; the JSON export is the full artifact
    content += `/F1 ${l.size} Tf\n1 0 0 1 40 ${y} Tm\n(${pdfEscape(l.text)}) Tj\n`;
    y -= l.gap;
  }
  content += "ET";

  const enc = new TextEncoder();
  const streamBytes = enc.encode(content);

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${streamBytes.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(enc.encode(pdf).length);
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = enc.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${off.toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return enc.encode(pdf);
}
