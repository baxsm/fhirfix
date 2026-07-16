import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// an endpoint reference row: prose + params on the left, a sticky code rail
// (request + response examples) on the right. this is what fills the wide-screen
// space - the rail sits where a generic docs page leaves a dead gap. collapses to
// one column on smaller screens.
export function EndpointSection({
  id,
  title,
  method,
  path,
  children,
  rail,
}: {
  id: string;
  title: string;
  method: "GET" | "POST";
  path: string;
  children: React.ReactNode;
  rail: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 grid gap-x-10 gap-y-4 border-t pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
    >
      <div className="min-w-0 space-y-4">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <RoutePill method={method} path={path} />
        </div>
        {children}
      </div>
      <div className="min-w-0">
        <div className="space-y-3 lg:sticky lg:top-24">{rail}</div>
      </div>
    </section>
  );
}

// same two-column grid as EndpointSection but for reference topics that are not
// HTTP endpoints (idempotency, webhooks, errors) - plain title, no route pill.
// keeps the whole page one coherent two-column reference with no dead right gap.
export function RefSection({
  id,
  title,
  children,
  rail,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  rail: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 grid gap-x-10 gap-y-4 border-t pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
    >
      <div className="min-w-0 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
      <div className="min-w-0">
        <div className="space-y-3 lg:sticky lg:top-24">{rail}</div>
      </div>
    </section>
  );
}

// the compact before -> after score line for a fix response rail. echoes the
// report screen's ScoreDelta so the docs feel like this product, not a template.
export function ScoreLift({ before, after }: { before: number; after: number }) {
  const gain = after - before;
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
      <span className="text-muted-foreground">{before}</span>
      <ArrowRight className="size-3 text-muted-foreground/50" />
      <span className="text-emerald-400">{after}</span>
      {gain > 0 && <span className="text-emerald-400">+{gain}</span>}
    </div>
  );
}

// a route pill: colored method badge + mono path in a bordered box. the header of
// every endpoint section.
export function RoutePill({ method, path }: { method: "GET" | "POST"; path: string }) {
  const tone =
    method === "GET" ? "bg-emerald-500/10 text-emerald-400" : "bg-interactive/10 text-interactive";
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5">
      <span className={cn("rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold", tone)}>
        {method}
      </span>
      <code className="font-mono text-sm">{path}</code>
    </div>
  );
}

// a single request/response field row: name (mono) + type + optional required
// chip + description. mirrors the stripe/resend body-parameter layout.
//
// set `noChip` for rows that are not request parameters (behaviors, events) -
// "optional" is meaningless there and reads as a mistake.
export function ParamRow({
  name,
  type,
  required,
  noChip,
  children,
}: {
  name: string;
  type: string;
  required?: boolean;
  noChip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-sm font-medium">{name}</code>
        <span className="font-mono text-xs text-muted-foreground">{type}</span>
        {noChip ? null : required ? (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
            required
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">optional</span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

interface StatusCode {
  code: number;
  name: string;
  description: string;
}

// the http status summary table, stripe-style: code (mono) | name | description.
export function StatusTable({ rows }: { rows: StatusCode[] }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.code} className="border-b last:border-0">
              <td className="w-16 px-3 py-2.5 align-top font-mono text-sm font-medium tabular-nums">
                {r.code}
              </td>
              <td className="w-32 px-3 py-2.5 align-top font-medium">{r.name}</td>
              <td className="px-3 py-2.5 align-top text-muted-foreground">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// a section anchor + heading. scroll-margin so the sticky header does not cover
// the target when linked via #hash.
export function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 border-t pt-10 first:border-0 first:pt-0">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
