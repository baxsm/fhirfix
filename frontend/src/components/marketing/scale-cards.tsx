import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "./motion";

type Card = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  proof: string;
};

const CARDS: Card[] = [
  {
    eyebrow: "Batch",
    title: "Bundle, NDJSON, ZIP",
    body: "Upload a whole export and remediate at volume. Every resource is checked against the profile and re-verified in one run.",
    href: "/pricing",
    proof: "one run, every resource",
  },
  {
    eyebrow: "Registry",
    title: "Mapping registry",
    body: "Resolve your local codes and identifiers once. Suggestions, approvals, conflict resolution, and a full supersede history.",
    href: "/pricing",
    proof: "versioned, never mutated",
  },
  {
    eyebrow: "Scheduled",
    title: "Scheduled checks and drift",
    body: "Run conformance on a schedule and get alerted when a source drifts. Health per source, acknowledged inline.",
    href: "/pricing",
    proof: "hourly · daily · weekly",
  },
  {
    eyebrow: "Developers",
    title: "REST API, SDKs, CLI",
    body: "Wire remediation into CI or your ingestion pipeline. Typed SDKs, a CLI, idempotent runs, and a usage dashboard.",
    href: "/docs",
    proof: "10 endpoints · 2 SDKs",
  },
];

export function ScaleCards() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            Scale and integrate
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.14]">
            From one record to your whole pipeline.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            The same engine, wired into how your team actually works.
          </p>
        </Reveal>

        <Reveal
          className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2"
          index={1}
        >
          {CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group flex flex-col justify-between gap-6 bg-card p-6 transition-colors hover:bg-muted/40 sm:p-8"
            >
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {card.eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
              </div>
              <div className="flex items-center justify-between gap-4 border-t pt-4">
                <span className="font-mono text-[11px] text-muted-foreground">{card.proof}</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
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
