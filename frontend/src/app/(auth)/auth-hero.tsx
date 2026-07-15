"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import authReport from "../../../public/auth-report.png";

// per-route hero copy. sign-in reassures a returning user; sign-up frames the
// first action so the two screens don't read as the same page twice.
const DEFAULT_COPY = {
  title: "Every resource, checked against the spec.",
  body: "FHIRfix validates a record and everything it references, ranks what is broken, and applies the safe fixes until it re-verifies clean.",
};

const COPY: Record<string, { title: string; body: string }> = {
  "/sign-up": {
    title: "Point FHIRfix at your first bundle.",
    body: "Paste a FHIR resource or upload a bundle. FHIRfix maps its references, ranks every conformance failure, and fixes what it safely can.",
  },
};

// the auth left panel. no grid, no glow orbs, no grain, no code-window chrome —
// those are the default AI moves. a calm deep canvas with room to breathe, and
// the centerpiece is the product itself: a real screenshot of a remediation
// report (a genuine engine run: 640 -> 970, the gender/date fixes shown in the
// live before/after diff). it is our actual dashboard, not hand-drawn HTML.
export function AuthHero() {
  const pathname = usePathname();
  const copy = COPY[pathname] ?? DEFAULT_COPY;

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden border-r bg-background p-10 lg:flex xl:p-14">
      {/* one restrained light source, top-left, so the panel isn't dead flat.
          a wash, not orbs. */}
      <div
        className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full opacity-60"
        style={{
          background: "radial-gradient(circle, oklch(0.696 0.15 163.225 / 0.10), transparent 70%)",
        }}
      />

      <a href="/" className="relative w-fit">
        <BrandMark size="sm" />
      </a>

      {/* the report screenshot, framed as a floating product shot: tilted a few
          degrees in perspective and pushed slightly off the right edge (the
          modern "product UI at an angle" treatment) so it reads as a deliberate
          artifact, not the report painted onto the panel. a soft emerald ground
          glow + a deep shadow lift the near-black card off the near-black
          canvas. it is our real dashboard, not hand-drawn HTML. */}
      <div className="relative flex flex-1 items-center py-10" style={{ perspective: "1800px" }}>
        {/* emerald ground glow pooled behind the card so the black frame separates. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(55% 50% at 55% 45%, oklch(0.696 0.15 163.225 / 0.12), transparent 72%)",
          }}
        />
        <div
          className="relative w-[128%] overflow-hidden rounded-xl border border-white/[0.08] bg-card shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] ring-1 ring-black/40"
          style={{ transform: "rotateY(-11deg) rotateX(2.5deg) rotateZ(0.4deg)" }}
        >
          <Image
            src={authReport}
            alt="A FHIRfix remediation report: a Patient resource lifted from a 640 to a 970 conformance score, with the gender and date fixes shown in a before and after diff."
            priority
            className="h-auto w-full select-none"
            sizes="(min-width: 1024px) 60vw, 100vw"
          />
          {/* faint top-edge highlight so the frame catches the light source. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />
        </div>
      </div>

      <div className="relative max-w-md space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
        <p className="pt-2 font-mono text-xs text-muted-foreground/60">
          US Core 6.1.0 · FHIR R4 · Da Vinci PAS / PDex
        </p>
      </div>
    </div>
  );
}
