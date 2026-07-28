import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/playground", label: "Playground" },
      { href: "/pricing", label: "Pricing" },
      { href: "/docs", label: "API docs" },
      { href: "/docs/api-explorer", label: "API explorer" },
    ],
  },
  {
    heading: "Standards",
    links: [
      { href: "/docs", label: "US Core 6.1.0" },
      { href: "/docs", label: "FHIR R4" },
      { href: "/docs", label: "HL7v2 / C-CDA" },
      { href: "/docs", label: "CMS-0057-F" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Create workspace" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-background">
      <div className="mx-auto w-full max-w-6xl px-5 pt-14 sm:px-8">
        <div className="grid gap-10 pb-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-3">
            <BrandMark size="md" />
            <p className="max-w-xs text-sm text-muted-foreground">
              A wall of FHIR conformance errors, turned into a ranked, fixable report. Validate,
              understand, apply the safe fixes, re-verify to clean.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading} className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                {col.heading}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 py-6 text-xs text-muted-foreground">
          <p className="font-mono">© {new Date().getFullYear()} FHIRfix</p>
          <p className="font-mono">Protected health data stays encrypted.</p>
        </div>
      </div>

      {/* oversized wordmark, deliberately clipped by the page bottom */}
      <div
        aria-hidden
        className="pointer-events-none relative select-none overflow-hidden px-5 sm:px-8"
        style={{ height: "clamp(3.6rem, 13vw, 11rem)" }}
      >
        <div className="mx-auto w-full max-w-6xl">
          <span className="block text-center font-mono font-semibold leading-none tracking-tighter text-foreground/[0.11] [font-size:clamp(5rem,21vw,18rem)]">
            FHIRfix
          </span>
        </div>
      </div>
    </footer>
  );
}
