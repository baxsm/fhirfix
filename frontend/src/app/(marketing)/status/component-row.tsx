import { cn } from "@/lib/utils";

export type ComponentState = "operational" | "degraded" | "outage" | "unknown";

const STATE: Record<ComponentState, { label: string; dot: string; text: string }> = {
  operational: { label: "Operational", dot: "bg-success", text: "text-success" },
  degraded: { label: "Degraded", dot: "bg-warning", text: "text-warning" },
  outage: { label: "Outage", dot: "bg-destructive", text: "text-destructive" },
  unknown: { label: "Unknown", dot: "bg-muted-foreground/40", text: "text-muted-foreground" },
};

export function ComponentRow({
  name,
  description,
  state,
  detail,
  first,
}: {
  name: string;
  description: string;
  state: ComponentState;
  detail?: string;
  first?: boolean;
}) {
  const { label, dot, text } = STATE[state];
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-4 py-3.5",
        !first && "border-t border-border",
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {/* only surfaced when it says something the label does not */}
        {detail ? <p className="font-mono text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
        <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />
        <span className={cn("text-xs font-medium", text)}>{label}</span>
      </span>
    </div>
  );
}
