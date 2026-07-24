import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

// the vivid color-card row (the reference's carousel), mapped to REAL Team-tier
// capabilities. each card carries a faint line-art motif and a deep-tinted surface.
// on mobile it scrolls horizontally in its own container (no body overflow).

type Card = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  // tailwind bg + text tuned per card; kept dark-tinted so white/near-white text reads.
  surface: string;
  motif: React.ReactNode;
};

const CARDS: Card[] = [
  {
    eyebrow: "Batch",
    title: "Bundle, NDJSON, ZIP",
    body: "Upload a whole export and remediate at volume. Every resource is checked against the profile and re-verified in one run.",
    href: "/pricing",
    surface: "bg-[oklch(0.62_0.13_163)] text-white",
    motif: (
      <>
        <rect x="20" y="30" width="120" height="90" rx="8" />
        <rect x="35" y="15" width="120" height="90" rx="8" />
        <rect x="50" y="0" width="120" height="90" rx="8" />
      </>
    ),
  },
  {
    eyebrow: "Registry",
    title: "Mapping registry",
    body: "Resolve your local codes and identifiers once. Suggestions, approvals, conflict resolution, and a full supersede history.",
    href: "/pricing",
    surface: "bg-[oklch(0.58_0.16_264)] text-white",
    motif: (
      <>
        <circle cx="45" cy="60" r="14" />
        <circle cx="140" cy="30" r="14" />
        <circle cx="140" cy="100" r="14" />
        <path d="M59 60 H110 M126 40 L73 55 M126 90 L73 66" />
      </>
    ),
  },
  {
    eyebrow: "Scheduled",
    title: "Scheduled checks + drift",
    body: "Run conformance on a schedule and get alerted when a source drifts. Sparkline health per source, acknowledge inline.",
    href: "/pricing",
    surface: "bg-[oklch(0.68_0.14_200)] text-white",
    motif: (
      <>
        <path d="M20 90 L50 70 L80 82 L110 40 L140 56 L170 20" />
        <circle cx="110" cy="40" r="5" fill="currentColor" />
      </>
    ),
  },
  {
    eyebrow: "Developers",
    title: "REST API, SDKs, CLI",
    body: "Wire remediation into CI or your ingestion pipeline. Typed SDKs, a CLI, idempotent runs, and a usage dashboard.",
    href: "/docs",
    surface: "bg-[oklch(0.66_0.12_75)] text-white",
    motif: (
      <>
        <path d="M60 40 L30 70 L60 100" />
        <path d="M120 40 L150 70 L120 100" />
        <path d="M95 30 L85 110" />
      </>
    ),
  },
];

export function ScaleCards() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Scale &amp; integrate
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.08]">
            From one record to your whole pipeline.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            The same engine, wired into how your team actually works.
          </p>
        </Reveal>

        <Reveal
          className="-mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4"
          index={1}
        >
          {CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={cn(
                "group relative flex min-h-[16rem] w-[80vw] max-w-[20rem] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl p-5 sm:w-auto sm:max-w-none",
                card.surface,
              )}
            >
              {/* line-art motif, bottom-right, faint. purely decorative. */}
              <svg
                role="presentation"
                aria-hidden
                viewBox="0 0 190 130"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute -bottom-2 -right-2 h-32 w-44 opacity-20"
              >
                {card.motif}
              </svg>

              <div className="relative">
                <p className="font-mono text-[11px] uppercase tracking-wide text-white/70">
                  {card.eyebrow}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{card.title}</h3>
              </div>
              <div className="relative space-y-4">
                <p className="text-sm text-white/85">{card.body}</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium">
                  Learn more
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
