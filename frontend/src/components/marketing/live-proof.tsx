import Link from "next/link";
import { PlaygroundPanel } from "@/components/marketing/playground-panel";
import { Reveal } from "./motion";

export function LiveProof() {
  return (
    <section className="stack-panel relative overflow-hidden bg-background/70 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Run it now
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.08]">
            Not a demo video. The real engine, on your record.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            Paste a FHIR resource or an HL7v2 message and run the same deterministic pipeline the
            product uses. See the ranked findings and the before/after conformance score.
            Identifiers in the corrected output are redacted.
          </p>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-4xl" index={1}>
          <PlaygroundPanel compact />
        </Reveal>

        <Reveal className="mt-5 text-center" index={2}>
          <p className="font-mono text-xs text-muted-foreground">
            Rate-limited for the public demo.{" "}
            <Link href="/playground" className="text-interactive hover:underline">
              Open the full playground
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
