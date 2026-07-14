"use client";

import { ArrowRight, FileScan, Map, ShieldCheck, Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// phase 1 overview: brand-new workspaces have no runs yet, so this renders the
// guided first-run state (pages.md), not a symmetric card grid or fake data.
// the runs/trend/credits data views land in phases 2-4.
export function OverviewView({ workspace }: { workspace: string }) {
  const base = `/app/${workspace}`;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Get started</h1>
        <p className="text-sm text-muted-foreground">
          Run a conformance check to see ranked, plain-language findings and auto-fixes.
        </p>
      </header>

      {/* primary focal action - the highest-leverage element on an empty workspace */}
      <div className="raised relative overflow-hidden rounded-lg border bg-card">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-interactive/[0.06] to-transparent" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md border bg-background">
                <Terminal className="size-3.5 text-muted-foreground" />
              </span>
              <h2 className="text-sm font-semibold">Run your first check</h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Paste FHIR or HL7v2, pick profiles, and the engine detects, explains, and fixes the
              conformance failures.
            </p>
            <p className="pt-1 font-mono text-[11px] text-muted-foreground/70">
              US Core 6.1.0 · FHIR R4 · Da Vinci PAS 2.0.1 / PDex 2.0.0
            </p>
          </div>
          <Button asChild size="sm" className="h-9 shrink-0">
            <Link href={`${base}/check`}>
              <FileScan className="size-4" />
              New check
            </Link>
          </Button>
        </div>
      </div>

      <section className="space-y-2.5">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Set up your workspace
        </h3>
        <div className="raised divide-y overflow-hidden rounded-lg border bg-card">
          <NextStep
            index="01"
            icon={Map}
            title="Import your mapping registry"
            body="Bring assigning-authority and code mappings so fixes apply automatically."
            href={`${base}/mappings`}
          />
          <NextStep
            index="02"
            icon={ShieldCheck}
            title="Explore the conformance packet"
            body="Run a CMS-0057-F test kit and export attestation-ready audit evidence."
            href={`${base}/conformance`}
          />
        </div>
      </section>
    </div>
  );
}

function NextStep({
  index,
  icon: Icon,
  title,
  body,
  href,
}: {
  index: string;
  icon: typeof Map;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-muted/40"
    >
      <span className="font-mono text-xs text-muted-foreground/50">{index}</span>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="truncate text-xs leading-tight text-muted-foreground">{body}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </Link>
  );
}
