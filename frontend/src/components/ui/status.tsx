import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Check, CircleDashed, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

// one status vocabulary for the whole app.
//
// the rule that shapes this: success is the EXPECTED state, so it gets the
// least emphasis. when every completed row was a filled green pill, three
// greens per row meant green stopped meaning anything and the single failed
// row had to compete with them. colour is spent on exceptions only.
//
// every tone also carries an icon, so state is never encoded by colour alone.
export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "pending";

const TONE: Record<StatusTone, { dot: string; text: string; icon: LucideIcon; ring: string }> = {
  // the quiet default. used for "completed" - it happened, it was fine.
  neutral: {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    icon: CircleDashed,
    ring: "border-border",
  },
  // reserved for a genuine improvement worth pointing at (a score that rose,
  // a fix that applied) - never for "this row exists and did not error".
  success: {
    dot: "bg-primary",
    text: "text-primary",
    icon: Check,
    ring: "border-primary/30",
  },
  warning: {
    dot: "bg-warning",
    // text-warning, not text-warning-foreground. the -foreground token is
    // near-white (oklch 0.985) because it is meant to sit ON a filled warning
    // background; as text on the near-white canvas it measured 1:1 contrast and
    // the label was invisible. danger and info already use their base token.
    text: "text-warning",
    icon: AlertTriangle,
    ring: "border-warning/40",
  },
  danger: {
    dot: "bg-destructive",
    text: "text-destructive",
    icon: X,
    ring: "border-destructive/30",
  },
  info: {
    dot: "bg-info",
    text: "text-info",
    icon: Info,
    ring: "border-info/30",
  },
  pending: {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    icon: Loader2,
    ring: "border-border",
  },
};

/**
 * default status presentation: a small dot plus plain text. deliberately not a
 * filled pill - a pill on every row is what created the noise.
 */
export function StatusDot({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          t.dot,
          tone === "pending" && "animate-pulse",
        )}
      />
      <span className={tone === "neutral" || tone === "pending" ? "text-muted-foreground" : t.text}>
        {children}
      </span>
    </span>
  );
}

/**
 * bordered chip. use only where a status must survive being scanned out of
 * context (a report header, a detail page), not in a long list.
 */
export function StatusChip({
  tone,
  children,
  icon = true,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
}) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-md border bg-card px-2",
        "text-xs font-medium whitespace-nowrap",
        t.ring,
        t.text,
        className,
      )}
    >
      {icon && <Icon aria-hidden className={cn("size-3", tone === "pending" && "animate-spin")} />}
      {children}
    </span>
  );
}

/** severity rail colour for a list row. transparent when nothing is wrong. */
export function railClass(tone: StatusTone): string {
  switch (tone) {
    case "danger":
      return "border-l-destructive";
    case "warning":
      return "border-l-warning";
    case "success":
      return "border-l-primary";
    case "info":
      return "border-l-info";
    default:
      return "border-l-transparent";
  }
}
