"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * selection controls, in one place.
 *
 * these were six separately-styled groups whose active state was carried by a
 * 5% background tint with no change of weight, ink or border - a wcag 1.4.11
 * failure (a control's state must contrast 3:1 with its adjacent colour). the
 * fix is LUMINANCE separation, not a different hue: swapping the old blue for
 * the violet brand would have left it just as invisible.
 *
 * selected uses neutral ink rather than the brand accent on purpose. selection
 * is a mechanical, high-frequency state; spending violet on it would make the
 * brand colour mean "selected" everywhere and stop it meaning the brand. emerald
 * stays reserved for pass/success.
 *
 * the three exports are deliberately different components because they are
 * different controls (carbon: a switcher "toggles between formats of the same
 * content" and sits lower in the hierarchy than tabs; primer: a segmented
 * control is a mode selector, NOT a tablist, and must not take that aria role).
 */

/**
 * choose a MODE for one surface. renders as a real tablist because it swaps the
 * panel below it.
 */
export function ModeSwitch({
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
      role="tablist"
      aria-label={label}
      className={cn("flex items-center gap-1 rounded-lg bg-muted/60 p-1", className)}
    >
      {children}
    </div>
  );
}

export function ModeSwitchItem({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "press flex-1 cursor-pointer rounded-md px-3 py-1.5 text-left transition-colors",
        // selected: a real white card on a grey trough, plus a shadow. the
        // trough is what makes the fill legible - a white pill on a white panel
        // is the invisible state this replaces.
        active ? "raised bg-card" : "hover:bg-card/50",
      )}
    >
      <span
        className={cn(
          "block text-xs",
          // weight carries the state as well as fill, so it survives greyscale
          active ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
        )}
      >
        {label}
      </span>
      {hint && <span className="block text-[11px] text-muted-foreground/80">{hint}</span>}
    </button>
  );
}

/**
 * narrow a list. a filter is NOT a view switch: when it is on, the numbers on
 * screen are a subset, and a user who cannot tell reads a filtered count as a
 * total. in a compliance product that is a correctness problem, so an active
 * filter is filled ink and carries its count.
 */
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
        "press inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
        active
          ? tone === "danger"
            ? "border-destructive bg-destructive text-destructive-foreground font-semibold"
            : "border-foreground bg-foreground text-background font-semibold"
          : "border-border font-medium text-muted-foreground hover:border-foreground/25 hover:text-foreground",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
      {count != null && (
        <span
          className={cn(
            "font-mono tabular-nums",
            active ? "opacity-80" : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * pick one of a set of closely-related options and apply it immediately. lower
 * hierarchy than a mode switch - used for status facets and method filters.
 */
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
      // primer: a segmented control is not a tablist/radiogroup. aria-current is
      // the announced selection.
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "press cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors",
        active
          ? "bg-foreground font-semibold text-background"
          : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
      {count != null && (
        <span className={cn("ml-1.5 font-mono tabular-nums", active ? "opacity-75" : "opacity-60")}>
          {count}
        </span>
      )}
    </button>
  );
}
