"use client";

import { usePathname } from "next/navigation";
import { ReportPreview } from "./report-preview";

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
// those are the default AI moves. a calm deep canvas with room to breathe; the
// centerpiece is the remediation report (report-preview.tsx, a placeholder until
// the real report component exists). the product's actual job is the hero.
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

      <a
        href="/"
        className="relative flex w-fit items-center gap-2 font-mono text-sm font-semibold"
      >
        <span className="inline-block size-2.5 rounded-sm bg-primary" />
        FHIRfix
      </a>

      <div className="relative flex flex-1 flex-col justify-center py-10">
        <ReportPreview />
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
