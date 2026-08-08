import { Check } from "lucide-react";
import Image from "next/image";
import mappingsShot from "../../../public/mappings-shot.png";
import { Reveal } from "./motion";

const FACTS = [
  "Authorities and code systems learned from real runs",
  "Every write is versioned, nothing is mutated in place",
  "Workspace scoped, so one team's mapping never leaks to another",
  "Approve, deprecate or reject, with a full audit trail",
];

export function ReportPreview() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-2xl space-y-5 text-center">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            The registry
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.14]">
            Every fix you approve makes the next run cleaner.
          </h2>
          <p className="text-balance text-muted-foreground">
            When a run meets an assigning authority it does not know, FHIRfix learns the mapping and
            queues it for review. Approve it once and every future record carrying that authority is
            corrected automatically.
          </p>
        </Reveal>

        <Reveal index={1} className="mt-12">
          <Image
            src={mappingsShot}
            alt="The mapping registry: six assigning authorities learned from a run, each with the target system it maps to, awaiting approval."
            sizes="(min-width: 1152px) 1088px, 100vw"
            className="rounded-xl border shadow-[0_20px_60px_-30px_oklch(0.5_0.02_260/0.35)]"
          />
        </Reveal>

        <Reveal index={2}>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {FACTS.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                {f}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
