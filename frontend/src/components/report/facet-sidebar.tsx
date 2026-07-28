"use client";

import { cn } from "@/lib/utils";
import type { FindingRow, Severity } from "./report-types";

export type Facets = {
  severities: Set<Severity>;
  fixableOnly: boolean;
  hideApplied: boolean;
  hideDismissed: boolean;
};

export const EMPTY_FACETS: Facets = {
  severities: new Set(),
  fixableOnly: false,
  hideApplied: false,
  hideDismissed: true,
};

export type Preset = "all" | "auto-fixable" | "critical" | "needs-review";

// opinionated presets so the landing view is already triaged, not a raw dump.
export function applyPreset(preset: Preset): Facets {
  switch (preset) {
    case "auto-fixable":
      return { severities: new Set(), fixableOnly: true, hideApplied: true, hideDismissed: true };
    case "critical":
      return {
        severities: new Set<Severity>(["error"]),
        fixableOnly: false,
        hideApplied: false,
        hideDismissed: true,
      };
    case "needs-review":
      return { severities: new Set(), fixableOnly: false, hideApplied: true, hideDismissed: true };
    default:
      return { ...EMPTY_FACETS };
  }
}

export function filterFindings(findings: FindingRow[], f: Facets, preset: Preset): FindingRow[] {
  return findings.filter((finding) => {
    if (f.hideDismissed && finding.fixStatus === "dismissed") return false;
    if (f.hideApplied && finding.fixStatus === "applied") return false;
    if (f.severities.size > 0 && !f.severities.has(finding.severity as Severity)) return false;
    if (f.fixableOnly && finding.fixStatus !== "suggested") return false;
    if (preset === "needs-review" && finding.fixStatus === "suggested") return false;
    return true;
  });
}

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: "all", label: "All findings" },
  { key: "auto-fixable", label: "Auto-fixable" },
  { key: "critical", label: "Critical only" },
  { key: "needs-review", label: "Needs review" },
];

function Row({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-foreground/[0.07] text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function FacetSidebar({
  findings,
  facets,
  preset,
  onPreset,
  onFacets,
}: {
  findings: FindingRow[];
  facets: Facets;
  preset: Preset;
  onPreset: (p: Preset) => void;
  onFacets: (f: Facets) => void;
}) {
  const count = (pred: (f: FindingRow) => boolean) => findings.filter(pred).length;
  const toggleSeverity = (s: Severity) => {
    const next = new Set(facets.severities);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onFacets({ ...facets, severities: next });
    onPreset("all");
  };

  return (
    <aside className="raised w-full shrink-0 space-y-4 self-start rounded-lg border bg-card p-2.5 lg:w-52">
      <div className="space-y-1">
        <p className="px-2.5 pb-1 font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-muted-foreground/70">
          Presets
        </p>
        {PRESETS.map((p) => (
          <Row key={p.key} active={preset === p.key} onClick={() => onPreset(p.key)}>
            {p.label}
          </Row>
        ))}
      </div>

      <div className="space-y-1">
        <p className="px-2.5 pb-1 font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-muted-foreground/70">
          Severity
        </p>
        {(["error", "warning", "info"] as Severity[]).map((s) => (
          <Row key={s} active={facets.severities.has(s)} onClick={() => toggleSeverity(s)}>
            <span className="capitalize">{s}</span>
            <span className="font-mono text-[11px] tabular-nums opacity-70">
              {count((f) => f.severity === s)}
            </span>
          </Row>
        ))}
      </div>

      <div className="space-y-1">
        <p className="px-2.5 pb-1 font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-muted-foreground/70">
          Filters
        </p>
        <Row
          active={facets.fixableOnly}
          onClick={() => {
            onFacets({ ...facets, fixableOnly: !facets.fixableOnly });
            onPreset("all");
          }}
        >
          Fixable only
          <span className="font-mono text-[11px] tabular-nums opacity-70">
            {count((f) => f.fixStatus === "suggested")}
          </span>
        </Row>
        <Row
          active={facets.hideApplied}
          onClick={() => onFacets({ ...facets, hideApplied: !facets.hideApplied })}
        >
          Hide applied
          <span className="font-mono text-[11px] tabular-nums opacity-70">
            {count((f) => f.fixStatus === "applied")}
          </span>
        </Row>
      </div>
    </aside>
  );
}
