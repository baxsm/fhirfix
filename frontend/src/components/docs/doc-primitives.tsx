import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function ScoreLift({ before, after }: { before: number; after: number }) {
  const gain = after - before;
  return (
    <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
      <span className="text-muted-foreground">{before}</span>
      <ArrowRight className="size-3 text-muted-foreground/50" />
      <span className="text-success">{after}</span>
      {gain > 0 && <span className="text-success">+{gain}</span>}
    </div>
  );
}

export function RoutePill({ method, path }: { method: "GET" | "POST"; path: string }) {
  const tone =
    method === "GET" ? "bg-success/10 text-success" : "bg-interactive/10 text-interactive";
  return (
    <div className="inline-flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5">
      <span className={cn("rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold", tone)}>
        {method}
      </span>
      <code className="font-mono text-sm">{path}</code>
    </div>
  );
}

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
          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
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
