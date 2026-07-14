"use client";

import { ArrowRight, CheckCircle2, Clock, Link2Off, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { FindingCard } from "@/components/report/finding-card";
import type { FindingRow, Severity } from "@/components/report/report-types";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

interface ShareData {
  run: {
    id: string;
    inputType: string;
    scoreBefore: number | null;
    scoreAfter: number | null;
    findingsTotal: number;
    findingsAutoFixable: number;
    resourceCount: number;
  };
  redacted: boolean;
  findings: FindingRow[];
}

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: ShareData }
  | { kind: "expired" }
  | { kind: "revoked" }
  | { kind: "not_found" };

export function SharedReport({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    fetch(`${env.NEXT_PUBLIC_API_URL}/api/share/${token}`)
      .then(async (res) => {
        if (!active) return;
        if (res.status === 410) {
          const body = await res.json().catch(() => ({}));
          setState({ kind: body.state === "revoked" ? "revoked" : "expired" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "not_found" });
          return;
        }
        setState({ kind: "ok", data: (await res.json()) as ShareData });
      })
      .catch(() => active && setState({ kind: "not_found" }));
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <Link href="/">
          <BrandMark size="md" />
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link href="/sign-up">Run your own check</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        {state.kind === "loading" && (
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-14 animate-pulse rounded-md bg-muted" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {state.kind === "expired" && (
          <Gone
            icon={Clock}
            title="This link has expired"
            body="Shared reports expire for safety. Ask whoever shared it to create a new link."
          />
        )}
        {state.kind === "revoked" && (
          <Gone
            icon={Link2Off}
            title="This link was revoked"
            body="The owner turned off public access to this report."
          />
        )}
        {state.kind === "not_found" && (
          <Gone
            icon={Link2Off}
            title="Report not found"
            body="This share link is invalid or no longer exists."
          />
        )}

        {state.kind === "ok" && <Report data={state.data} />}
      </main>
    </div>
  );
}

function Report({ data }: { data: ShareData }) {
  const { run, findings, redacted } = data;
  const active = findings.filter((f) => f.fixStatus !== "dismissed");
  const counts: Record<Severity, number> = {
    error: active.filter((f) => f.severity === "error").length,
    warning: active.filter((f) => f.severity === "warning").length,
    info: active.filter((f) => f.severity === "info").length,
  };
  const applied = findings.filter((f) => f.fixStatus === "applied").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-sm text-muted-foreground">{run.id}</h1>
            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {run.inputType}
            </span>
            <span className="rounded border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground">
              read-only
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {run.resourceCount} scanned · {findings.length} findings
            {applied > 0 && <span className="text-emerald-400"> · {applied} auto-fixed</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 raised">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {run.scoreBefore ?? "-"}
          </span>
          <ArrowRight className="size-4 text-muted-foreground/50" />
          <span className="font-mono text-sm tabular-nums text-emerald-400">
            {run.scoreAfter ?? "-"}
          </span>
        </div>
      </div>

      {redacted && (
        <p className="flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-muted-foreground">
          <ShieldAlert className="size-3.5 text-amber-400" />
          Patient identifiers are redacted in this shared copy.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(["error", "warning", "info"] as Severity[]).map((s) => (
          <span
            key={s}
            className={cn("flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px]")}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                s === "error" ? "bg-red-500" : s === "warning" ? "bg-amber-500" : "bg-sky-500",
              )}
            />
            <span className="capitalize text-muted-foreground">{s}</span>
            <span className="font-mono tabular-nums">{counts[s]}</span>
          </span>
        ))}
      </div>

      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-6 py-14 text-center raised">
          <CheckCircle2 className="size-9 text-emerald-400" />
          <h2 className="font-medium">Conformant</h2>
          <p className="text-sm text-muted-foreground">No open findings remain.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {findings.map((f) => (
            <FindingCard key={f.id} finding={f} before={null} after={null} busy={false} readOnly />
          ))}
        </div>
      )}
    </div>
  );
}

function Gone({ icon: Icon, title, body }: { icon: typeof Clock; title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-md border bg-card px-6 py-16 text-center raised">
      <Icon className="size-8 text-muted-foreground" />
      <h1 className="font-medium">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Button asChild size="sm" variant="outline">
        <Link href="/">Go to FHIRfix</Link>
      </Button>
    </div>
  );
}
