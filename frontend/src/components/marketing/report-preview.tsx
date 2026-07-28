import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

const ROWS = [
  {
    sev: "error" as const,
    title: "Replace the gender code with a valid one",
    loc: "Patient.gender",
    count: 1,
    fixable: true,
  },
  {
    sev: "warning" as const,
    title: "Add the identifier system this value comes from",
    loc: "Patient.identifier[0].system",
    count: 3,
    fixable: true,
  },
  {
    sev: "error" as const,
    title: "Reformat birthDate to a valid FHIR date",
    loc: "Patient.birthDate",
    count: 1,
    fixable: true,
  },
  {
    sev: "info" as const,
    title: "Narrative text is recommended for US Core Patient",
    loc: "Patient.text",
    count: 1,
    fixable: false,
  },
];

const SEV_RAIL = {
  error: "bg-destructive",
  warning: "bg-warning",
  info: "bg-interactive",
} as const;

const SEV_DOT = {
  error: "text-destructive",
  warning: "text-warning",
  info: "text-interactive",
} as const;

function Chip({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: keyof typeof SEV_DOT;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs">
      <span className={cn("size-1.5 rounded-full", SEV_RAIL[tone])} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{count}</span>
    </span>
  );
}

export function ReportPreview() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal className="space-y-5">
            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-success" />
              The report
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.08]">
              A scary total becomes a ranked list you can act on.
            </h2>
            <p className="text-balance text-muted-foreground">
              Findings are deduplicated and ordered so the fixable, high-frequency issues rise to
              the top. Each row is a plain-language title, the exact FHIRPath location, an
              occurrence count, and a one-click apply. The header turns the whole wall into a single
              action: apply every safe fix.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Ranked by severity × fixability × occurrence",
                "Plain-language explanation + spec citation on every finding",
                "Word-level before/after diff, syntax highlighted",
                "Before/after conformance score, 0–1000",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal index={1}>
            <div className="overflow-hidden rounded-xl border bg-card shadow-[0_20px_60px_-30px_oklch(0.5_0.02_260/0.35)]">
              {/* header bar */}
              <div className="space-y-3 border-b bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    run_nx458 · 1 resource · 6 findings
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                    <span className="text-muted-foreground">640</span>
                    <ArrowRight className="size-3 text-muted-foreground/50" />
                    <span className="font-semibold text-success">970</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip label="Errors" count={2} tone="error" />
                  <Chip label="Warnings" count={3} tone="warning" />
                  <Chip label="Info" count={1} tone="info" />
                </div>
                <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2">
                  <Check className="size-4 shrink-0 text-success" />
                  <span className="text-sm">
                    <span className="font-medium">4 of 6 auto-fixable</span>{" "}
                    <span className="text-muted-foreground">apply all safe fixes</span>
                  </span>
                </div>
              </div>

              {/* ranked rows */}
              <ul className="divide-y">
                {ROWS.map((r) => (
                  <li key={r.loc} className="flex items-stretch">
                    <span className={cn("w-0.5 shrink-0", SEV_RAIL[r.sev])} />
                    <div className="flex flex-1 items-start justify-between gap-3 p-3">
                      <div className="min-w-0 space-y-1">
                        <p className="flex items-center gap-2 text-sm">
                          <span className={cn("text-[10px]", SEV_DOT[r.sev])}>●</span>
                          <span className="truncate">{r.title}</span>
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {r.loc}
                          {r.count > 1 && (
                            <span className="ml-2 text-muted-foreground/60">×{r.count}</span>
                          )}
                        </p>
                      </div>
                      {r.fixable ? (
                        <span className="shrink-0 rounded border border-success/30 bg-success/5 px-2 py-0.5 text-[10px] font-medium text-success">
                          Auto-fix
                        </span>
                      ) : (
                        <span className="shrink-0 rounded border px-2 py-0.5 text-[10px] text-muted-foreground">
                          Review
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
