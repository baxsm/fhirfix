import {
  AlertTriangle,
  Check,
  CircleDashed,
  Info,
  Loader2,
  type LucideIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info" | "pending";

const TONE: Record<StatusTone, { dot: string; text: string; icon: LucideIcon; ring: string }> = {
  // the quiet default. used for "completed" - it happened, it was fine.
  neutral: {
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    icon: CircleDashed,
    ring: "border-border",
  },
  success: {
    dot: "bg-success",
    text: "text-success",
    icon: Check,
    ring: "border-success/30",
  },
  warning: {
    dot: "bg-warning",
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

