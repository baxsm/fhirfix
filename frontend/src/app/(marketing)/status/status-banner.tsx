import { AlertTriangle, Check, CircleDashed, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SystemStatus = "operational" | "degraded" | "outage" | "unknown";

// "unknown" is a real state, not an error state. if the check itself cannot be
// reached, saying so beats rendering green or red on no evidence.
const BANNER: Record<
  SystemStatus,
  { icon: typeof Check; title: string; body: string; surface: string; iconColor: string }
> = {
  operational: {
    icon: Check,
    title: "All systems operational",
    body: "Every component is responding normally.",
    surface: "border-success/30 bg-success-subtle",
    iconColor: "text-success",
  },
  degraded: {
    icon: AlertTriangle,
    title: "Partial degradation",
    body: "Some capacity is unavailable. Runs still complete, and may take longer than usual.",
    surface: "border-warning/40 bg-warning-subtle",
    iconColor: "text-warning",
  },
  outage: {
    icon: X,
    title: "Service disruption",
    body: "At least one component is not responding. Affected runs may fail or stay queued.",
    surface: "border-destructive/30 bg-destructive-subtle",
    iconColor: "text-destructive",
  },
  unknown: {
    icon: CircleDashed,
    title: "Status unavailable",
    body: "The health check could not be reached, so component state is unknown right now.",
    surface: "border-border bg-card",
    iconColor: "text-muted-foreground",
  },
};

export function StatusBanner({ status }: { status: SystemStatus }) {
  const { icon: Icon, title, body, surface, iconColor } = BANNER[status];
  return (
    <div className={cn("rounded-lg border", surface)}>
      <div className="flex items-start gap-3 px-4 py-3.5">
        <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", iconColor)} />
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}
