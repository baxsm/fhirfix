import type { Metadata } from "next";
import { serverApiUrl } from "@/lib/env";
import { ComponentRow, type ComponentState } from "./component-row";
import { StatusBanner, type SystemStatus } from "./status-banner";

export const metadata: Metadata = {
  title: "Status",
  description: "Live availability of the FHIRfix API, validation engine, and dashboard.",
  alternates: { canonical: "/status" },
};

// a cached status page is worse than none: it keeps reporting "operational"
// through an outage until the window expires. the backend already throttles the
// real probes to one per 15s, so rendering per-request costs a cache read, not
// a sidecar hit.
export const dynamic = "force-dynamic";

type CheckStatus = "pass" | "warn" | "fail";

interface ComponentCheck {
  componentId: string;
  status: CheckStatus;
  observedValue?: number;
  observedUnit?: string;
  output?: string;
}

interface HealthReport {
  status: CheckStatus;
  checks: Record<string, ComponentCheck[]>;
}

// what a customer recognises, not what the container is called. each row names
// the dependency it actually reflects so a red row points somewhere.
const COMPONENTS: { id: string; name: string; description: string }[] = [
  {
    id: "postgres",
    name: "API and dashboard",
    description: "Runs, reports, mappings, and sign-in",
  },
  {
    id: "redis",
    name: "Run queue",
    description: "Queued validation, remediation, and scheduled runs",
  },
  {
    id: "validator",
    name: "Validation engine",
    description: "FHIR profile validation against US Core",
  },
  {
    id: "converter",
    name: "Format conversion",
    description: "HL7 v2 and C-CDA to FHIR R4",
  },
];

async function loadHealth(): Promise<HealthReport | null> {
  try {
    const res = await fetch(`${serverApiUrl()}/health/ready`, {
      cache: "no-store",
    });
    // 503 is the documented response for a failing check, so it still carries
    // a body worth rendering. only a non-json answer counts as unreachable.
    return (await res.json()) as HealthReport;
  } catch {
    return null;
  }
}

export default async function StatusPage() {
  const report = await loadHealth();

  const overall: SystemStatus = !report
    ? "unknown"
    : report.status === "pass"
      ? "operational"
      : report.status === "warn"
        ? "degraded"
        : "outage";

  const byId = new Map<string, ComponentCheck>();
  for (const group of Object.values(report?.checks ?? {})) {
    for (const check of group) byId.set(check.componentId, check);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Status</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Live availability of the FHIRfix platform, checked when this page loads.
        </p>
      </header>

      <div className="mt-8">
        <StatusBanner status={overall} />
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-tight">Components</h2>
        <div className="mt-3 overflow-hidden rounded-lg border bg-card">
          {COMPONENTS.map((component, i) => {
            const check = byId.get(component.id);
            const state: ComponentState = !check
              ? "unknown"
              : check.status === "pass"
                ? "operational"
                : check.status === "warn"
                  ? "degraded"
                  : "outage";
            return (
              <ComponentRow
                key={component.id}
                name={component.name}
                description={component.description}
                state={state}
                detail={check?.output}
                first={i === 0}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-10 space-y-2">
        <h2 className="text-sm font-semibold tracking-tight">Incident history</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This page reports the state of each component at the time you load it. We do not yet
          publish historical uptime or a past-incident archive.
        </p>
      </section>
    </div>
  );
}
