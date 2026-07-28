"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";


export function PanelTabs({
  children,
  label,
  actions,
  className,
}: {
  children: React.ReactNode;
  label: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3 border-b", className)}>
      <div role="tablist" aria-label={label} className="flex items-center gap-4">
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pb-2">{actions}</div>}
    </div>
  );
}

export function PanelTab({
  active,
  onClick,
  children,
  count,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 px-0.5 pb-2 text-sm transition-colors outline-none focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "border-foreground font-medium text-foreground"
          : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
      {count != null && (
        <span
          className={cn(
            "font-mono text-xs tabular-nums",
            active ? "text-muted-foreground" : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function FilterPill({
  active,
  onClick,
  children,
  count,
  icon: Icon,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  icon?: LucideIcon;
  tone?: "neutral" | "danger";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "press inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? tone === "danger"
            ? "border-destructive/40 bg-destructive/10 font-medium text-destructive"
            : "border-foreground/25 bg-muted font-medium text-foreground"
          : "border-border bg-card text-foreground hover:border-foreground/25 hover:bg-muted",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
      {count != null && (
        <span
          className={cn(
            "rounded font-mono text-[0.6875rem] tabular-nums",
            active ? "text-foreground/70" : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function ChoiceGroup({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center gap-0.5 rounded-lg bg-muted/70 p-0.5", className)}
    >
      {children}
    </div>
  );
}

export function ChoiceChip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "press cursor-pointer rounded-sm px-2 py-1 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-background font-medium text-foreground shadow-[0_1px_2px_0_oklch(0.145_0_0/0.10)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {count != null && (
        <span
          className={cn(
            "ml-1.5 font-mono tabular-nums",
            active ? "text-muted-foreground" : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
