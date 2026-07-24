"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

// the pipeline, as a stepper. mirrors the reference's tabbed insight section: pill
// tabs across the top, left copy / right visual below. each stage is a REAL step in
// the engine (detect -> convert -> validate -> rank -> fix -> re-verify), and each
// right-side visual is a small mono panel showing that stage's actual kind of output.

type Stage = {
  id: string;
  tab: string;
  title: string;
  body: string;
  visual: React.ReactNode;
};

// a mono "terminal" panel used by every stage. a fixed min-height keeps all stages
// the same size so the section doesn't jump or leave dead space as tabs switch.
function MonoPanel({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-[0_16px_50px_-24px_oklch(0.5_0.02_260/0.3)]">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2 rounded-full bg-destructive/60" />
          <span className="size-2 rounded-full bg-warning/60" />
          <span className="size-2 rounded-full bg-success/60" />
        </span>
        <span className="ml-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="flex min-h-[168px] flex-col justify-center gap-1 p-5 font-mono text-[12px] leading-relaxed">
        {children}
      </div>
    </div>
  );
}

const SEV = {
  error: "text-destructive",
  warning: "text-warning",
  ok: "text-success",
  dim: "text-muted-foreground",
} as const;

const STAGES: Stage[] = [
  {
    id: "detect",
    tab: "Detect",
    title: "Detect format and version",
    body: "Point FHIRfix at anything. It fingerprints the input — FHIR JSON, an HL7v2 message, a C-CDA document — and picks the right pipeline before any validation runs.",
    visual: (
      <MonoPanel label="input">
        <p className={SEV.dim}>received 1 payload</p>
        <p>
          <span className={SEV.dim}>format </span>
          <span className={SEV.ok}>HL7v2</span>
        </p>
        <p>
          <span className={SEV.dim}>message </span>
          <span>ADT^A01</span>
        </p>
        <p>
          <span className={SEV.dim}>route </span>
          <span className={SEV.ok}>convert → validate</span>
        </p>
      </MonoPanel>
    ),
  },
  {
    id: "convert",
    tab: "Convert",
    title: "Convert HL7v2 and C-CDA to FHIR",
    body: "Legacy formats become FHIR resources with the Microsoft converter, then a mapping registry resolves your local codes and identifiers so the output matches your systems.",
    visual: (
      <MonoPanel label="convert">
        <p>
          <span className={SEV.dim}>PID → </span>
          <span className={SEV.ok}>Patient</span>
        </p>
        <p>
          <span className={SEV.dim}>PV1 → </span>
          <span className={SEV.ok}>Encounter</span>
        </p>
        <p>
          <span className={SEV.dim}>map </span>
          SIMULATOR-MRN → sid/mrn
        </p>
        <p className={SEV.ok}>3 resources emitted</p>
      </MonoPanel>
    ),
  },
  {
    id: "validate",
    tab: "Validate",
    title: "Validate against the profile",
    body: "The HL7 validator checks every resource and everything it references against US Core, USCDI, and Da Vinci profiles — the same rules a payer or registry will hold you to.",
    visual: (
      <MonoPanel label="validate">
        <p>
          <span className={SEV.error}>error </span>
          <span className={SEV.dim}>Patient.gender code invalid</span>
        </p>
        <p>
          <span className={SEV.warning}>warn </span>
          <span className={SEV.dim}>identifier.system missing</span>
        </p>
        <p>
          <span className={SEV.error}>error </span>
          <span className={SEV.dim}>birthDate wrong format</span>
        </p>
        <p className={SEV.dim}>US Core 6.1.0 · 5 findings</p>
      </MonoPanel>
    ),
  },
  {
    id: "rank",
    tab: "Rank",
    title: "Rank and explain, in plain language",
    body: "Findings are deduplicated and ranked by a composite of severity, fixability, and occurrence — so a fixable high-frequency issue outranks a scary one-off. Each gets a human explanation.",
    visual: (
      <MonoPanel label="report">
        <p>
          <span className={SEV.error}>●</span> Replace gender code with a valid one{" "}
          <span className={SEV.dim}>×1</span>
        </p>
        <p>
          <span className={SEV.warning}>●</span> Add identifier.system{" "}
          <span className={SEV.dim}>×3</span>
        </p>
        <p>
          <span className={SEV.error}>●</span> Reformat birthDate{" "}
          <span className={SEV.dim}>×1</span>
        </p>
        <p className={SEV.ok}>4 of 5 auto-fixable</p>
      </MonoPanel>
    ),
  },
  {
    id: "fix",
    tab: "Fix",
    title: "Apply the safe fixes",
    body: "Deterministic fixes apply with one click, or all at once. Ambiguous ones get a softer AI hand-off; fixes that could change clinical meaning stay gated behind explicit opt-in.",
    visual: (
      <MonoPanel label="diff">
        <p>
          <span className={SEV.error}>- </span>
          <span className={SEV.dim}>&quot;gender&quot;: &quot;M&quot;</span>
        </p>
        <p>
          <span className={SEV.ok}>+ </span>&quot;gender&quot;: &quot;male&quot;
        </p>
        <p>
          <span className={SEV.error}>- </span>
          <span className={SEV.dim}>&quot;birthDate&quot;: &quot;19740312&quot;</span>
        </p>
        <p>
          <span className={SEV.ok}>+ </span>&quot;birthDate&quot;: &quot;1974-03-12&quot;
        </p>
      </MonoPanel>
    ),
  },
  {
    id: "reverify",
    tab: "Re-verify",
    title: "Re-verify to clean",
    body: "The corrected record runs back through the validator to prove the fixes held. The conformance score moves before your eyes, and you get an all-clear you can trust.",
    visual: (
      <MonoPanel label="re-verify">
        <p className={SEV.dim}>re-running validator…</p>
        <p>
          <span className={SEV.dim}>score </span>
          <span className={SEV.dim}>640</span> → <span className={SEV.ok}>970</span>
        </p>
        <p className={SEV.ok}>✓ re-verified clean</p>
        <p className={SEV.dim}>4 auto-fixed · 1 needs review</p>
      </MonoPanel>
    ),
  },
];

export function PipelineSection() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            The pipeline
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.08]">
            One pass, from broken input to conformant record.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Every check runs the same deterministic sequence. Step through it.
          </p>
        </Reveal>

        <Reveal className="mt-12" index={1}>
          <Tabs defaultValue="detect" className="gap-8">
            <TabsList
              variant="line"
              className="mx-auto flex w-full max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2"
            >
              {STAGES.map((s, i) => (
                <TabsTrigger key={s.id} value={s.id} className="gap-2 px-0 text-sm">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.tab}
                </TabsTrigger>
              ))}
            </TabsList>

            {STAGES.map((s) => (
              <TabsContent key={s.id} value={s.id}>
                <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-2">
                  <div className={cn("space-y-4")}>
                    <h3 className="text-xl font-medium tracking-tight sm:text-2xl">{s.title}</h3>
                    <p className="text-muted-foreground">{s.body}</p>
                  </div>
                  <div>{s.visual}</div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Reveal>
      </div>
    </section>
  );
}
