import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal } from "./motion";

export function FinalCta() {
  return (
    <section className="bg-background px-5 py-16 sm:px-8 sm:py-24">
      <Reveal className="mx-auto w-full max-w-6xl">
        <div className="cta-panel relative overflow-hidden rounded-3xl px-6 py-16 text-center sm:px-10 sm:py-20">
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-[2.75rem] sm:leading-[1.06]">
              Stop reading validator output. Start shipping conformant records.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-white/70">
              Run your first check free against the real engine. No card, no seat license. You pay
              per check, only when you remediate.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-11 bg-white px-5 text-[0.95rem] text-[oklch(0.18_0.006_260)] hover:bg-white/90"
              >
                <Link href="/sign-up">
                  Start free
                  <ArrowRight className="size-4" data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 border-white/25 bg-transparent px-5 text-[0.95rem] text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/docs">Read the docs</Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
