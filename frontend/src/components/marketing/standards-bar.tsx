import { Reveal } from "./motion";

// the honest trust bar: the standards and implementation guides FHIRfix validates
// against. NO fabricated customer logos (product-honesty rule) — for this buyer,
// "we hold you to exactly what the payer/registry will" is the credible signal.
const STANDARDS = [
  "US Core 6.1.0",
  "FHIR R4",
  "USCDI v3",
  "HL7v2",
  "C-CDA",
  "Da Vinci PAS",
  "Da Vinci PDex",
  "CMS-0057-F",
];

export function StandardsBar() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
        <Reveal className="flex flex-col items-center gap-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Validates against the profiles your payers and registries enforce
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {STANDARDS.map((s) => (
              <li
                key={s}
                className="font-mono text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                {s}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
