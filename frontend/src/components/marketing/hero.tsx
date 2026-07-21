import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroGlyph } from "./hero-glyph";

// the hero. type-led: a mono eyebrow, one oversized display headline carrying the
// broken -> conformant story, tight subcopy, two CTAs, and the glyph. sits on the
// aurora-hero grain surface (applied by the section wrapper). above the fold, so it
// loads visible and enhances with the CSS load-in (hero-in), never hidden.
export function Hero() {
  return (
    <section className="aurora-hero grain relative overflow-hidden">
      <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="hero-in mb-8 w-full max-w-[26rem]">
            <HeroGlyph />
          </div>

          <p className="hero-in hero-in-1 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            US Core · FHIR R4 · HL7v2 · C-CDA
          </p>

          <h1 className="hero-in hero-in-2 mt-5 text-balance text-4xl font-semibold leading-[1.06] tracking-tight sm:text-[3.4rem] sm:leading-[1.04]">
            A wall of FHIR conformance errors, turned into a ranked, fixable report.
          </h1>

          <p className="hero-in hero-in-3 mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Validate a record against US Core, read plain-language findings, apply the safe
            deterministic fixes, and re-verify to clean. Billed per check, not per seat.
          </p>

          <div className="hero-in hero-in-4 mt-9 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-5 text-[0.95rem]">
              <Link href="/sign-up">
                Start free
                <ArrowRight className="size-4" data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-5 text-[0.95rem]">
              <Link href="/playground">Try the playground</Link>
            </Button>
          </div>

          <p className="hero-in hero-in-4 mt-5 font-mono text-xs text-muted-foreground">
            No card to start · runs against the real engine
          </p>
        </div>
      </div>
    </section>
  );
}
