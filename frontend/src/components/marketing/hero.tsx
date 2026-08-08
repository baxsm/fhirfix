import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="px-2 pt-2 sm:px-4 sm:pt-4">
      <div className="aurora-hero grain relative overflow-hidden rounded-3xl">
        <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-24 sm:px-8 sm:pb-32 sm:pt-32">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="hero-in font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              US Core · FHIR R4 · HL7v2 · C-CDA
            </p>

            <h1 className="hero-in hero-in-1 mt-5 text-balance text-4xl font-semibold leading-[1.22] tracking-tight sm:text-[3.75rem] sm:leading-[1.18]">
              A wall of FHIR conformance errors, turned into a{" "}
              {/* must not wrap: a split highlight paints two disconnected blocks */}
              <span className="whitespace-nowrap bg-primary px-2 py-0.5 text-primary-foreground">
                ranked, fixable
              </span>{" "}
              report.
            </h1>

            <p className="hero-in hero-in-2 mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
              Validate a record against US Core, read plain-language findings, apply the safe
              deterministic fixes, and re-verify to clean. Billed per check, not per seat.
            </p>

            <div className="hero-in hero-in-3 mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-11 px-5 text-[0.95rem]">
                <Link href="/sign-up">
                  Start free
                  <ArrowRight className="size-4" data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-5 text-[0.95rem]">
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>

            <p className="hero-in hero-in-4 mt-5 font-mono text-xs text-muted-foreground">
              No card to start · runs against the real engine
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
