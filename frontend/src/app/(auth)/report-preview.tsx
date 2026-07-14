import { ArrowRight, CheckCircle2, Wrench } from "lucide-react";

// a faithful STATIC slice of a real remediation report. these are the actual
// findings the deterministic engine produces for the golden US Core Patient case
// (converter-output identifier defects), captured verbatim from a real run
// (score 880 -> 970, 2 auto-applied, dom-6 narrative left for review). it is a
// non-interactive preview of the real /runs/[runId] screen, not invented data.
const PREVIEW_FINDINGS = [
  {
    severity: "warning" as const,
    fhirpath: "Patient.identifier[0].type.coding[0]",
    message:
      "A code with no system, so it can't be validated. Added the code system it comes from.",
    status: "applied" as const,
  },
  {
    severity: "warning" as const,
    fhirpath: "Patient.identifier[0].system",
    message:
      "The identifier system was a placeholder. Replaced it with the registered real system.",
    status: "applied" as const,
  },
  {
    severity: "warning" as const,
    fhirpath: "Patient",
    message: "Missing a human-readable narrative (dom-6). Left for review, not auto-changed.",
    status: "review" as const,
  },
];

export function ReportPreview() {
  return (
    <div className="mx-auto w-full max-w-[440px] space-y-3">
      {/* header slice: score delta + auto-fix leverage line */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 raised">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Conformance</p>
          <div className="flex items-center gap-2 font-mono text-lg tabular-nums">
            <span className="text-muted-foreground">880</span>
            <ArrowRight className="size-4 text-muted-foreground/50" />
            <span className="text-emerald-400">970</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-400">
          <CheckCircle2 className="size-3.5" />2 auto-fixed
        </div>
      </div>

      {/* ranked finding slices */}
      <div className="space-y-2">
        {PREVIEW_FINDINGS.map((f) => (
          <div
            key={f.fhirpath + f.status}
            className="relative overflow-hidden rounded-lg border bg-card raised"
          >
            <div className="absolute inset-y-0 left-0 w-[3px] bg-amber-500" />
            <div className="flex items-start gap-2.5 py-2.5 pl-4 pr-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs">{f.message}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{f.fhirpath}</p>
              </div>
              {f.status === "applied" ? (
                <span className="flex shrink-0 items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                  <Wrench className="size-2.5" />
                  Applied
                </span>
              ) : (
                <span className="shrink-0 rounded border bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Review
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
