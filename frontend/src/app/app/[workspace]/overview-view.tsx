"use client";

import { ArrowRight, FileScan, Map, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// phase 1 overview: brand-new workspaces have no runs yet, so this renders the
// guided first-run state (pages.md), not a symmetric card grid or fake data.
// the runs/trend/credits data views land in phases 2-4.
export function OverviewView({ workspace }: { workspace: string }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Get started</h1>
        <p className="text-sm text-muted-foreground">
          Run your first conformance check to see ranked, plain-language findings and auto-fixes.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-medium">Run your first check</h2>
            <p className="text-sm text-muted-foreground">
              Paste FHIR or HL7v2, pick profiles, and let the engine detect and fix.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href={`/app/${workspace}/check`}>
              <FileScan className="size-4" />
              New check
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Next steps</h3>
        <div className="divide-y rounded-lg border">
          <NextStep
            icon={Map}
            title="Import your mapping registry"
            body="Bring assigning-authority and code mappings so fixes apply automatically."
            href={`/app/${workspace}/mappings`}
          />
          <NextStep
            icon={ShieldCheck}
            title="Explore the conformance packet"
            body="Run a CMS-0057-F test kit and export audit evidence."
            href={`/app/${workspace}/conformance`}
          />
        </div>
      </div>
    </div>
  );
}

function NextStep({
  icon: Icon,
  title,
  body,
  href,
}: {
  icon: typeof Map;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{body}</p>
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
