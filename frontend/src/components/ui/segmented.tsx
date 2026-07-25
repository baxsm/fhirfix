"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * selection controls, in one place.
 *
 * the previous version gave all three controls the SAME treatment - a solid
 * `bg-foreground` chip - and justified it in a comment as "one selected state for
 * the whole app". on screen that failed twice over:
 *
 *  - a solid black fill is the heaviest material in a greyscale system, so a
 *    filter ended up outranking the primary button three inches away. the run
 *    list's "Failed only" filter was visually louder than "Run check".
 *  - three controls that mean different things (switch a panel / narrow a list /
 *    pick a facet) were indistinguishable, so nothing on screen told you whether
 *    pressing one would navigate, filter, or reformat.
 *
 * primer's navigation guidance is explicit about the order to reach for these:
 * underline FIRST (UnderlineNav when the url changes, UnderlinePanels when it
 * only swaps a panel), and a segmented control only when underline does not fit.
 * a segmented control also caps at 2-5 options. we had the fallback everywhere.
 *
 * measured off primer's own rendered UnderlineNav (computed styles, not a
 * screenshot): selected and unselected share the same colour AND the same font
 * weight; the entire selected state is a 2px ::after bar that changes colour.
 * the bar is present at 2px on every item so switching never shifts layout.
 * that restraint is the point - selection is a frequent, mechanical state and
 * should not repaint the control.
 */

/**
 * switch which panel is shown. underline, per the primer decision tree. this is
 * the DEFAULT choice for tabbed interfaces in this app.
 *
 * the underline is drawn on a wrapper rule so the inactive items sit on the same
 * baseline: without the shared rule the active item's bar floats with nothing to
 * align to, which is what makes hand-rolled underline tabs look crooked.
 */
export function PanelTabs({
  children,
  label,
  actions,
  className,
}: {
  children: React.ReactNode;
  label: string;
  /**
   * trailing controls that belong to the tabbed panel (a search box, a create
   * button). they sit ON the tab baseline rather than in a separate flex row:
   * when the tablist was one child of a justify-between row, the rule was only
   * as wide as the tabs themselves (measured 356px inside a 1454px container)
   * and the underline floated over the table with nothing to align to.
   */
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
        // -mb-px pulls the bar onto the container's rule so it replaces that
        // segment of the line rather than sitting under it.
        "-mb-px inline-flex cursor-pointer items-center gap-1.5 border-b-2 px-0.5 pb-2 text-sm transition-colors",
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

/**
 * narrow a list. a filter is NOT a view switch: when it is on, the numbers on
 * screen are a subset, and a user who cannot tell reads a filtered count as a
 * total. in a compliance product that is a correctness problem.
 *
 * so an active filter must be unmistakable, but it must NOT be the loudest thing
 * on the page. a tinted, bordered chip carrying its count reads as "applied"
 * without competing with a filled primary button. it also states what it is: the
 * old bare "Failed only 1" gave no clue whether it was a button, a link, or a
 * label until you clicked it.
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
        "press inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
        active
          ? tone === "danger"
            ? "border-destructive/40 bg-destructive/10 font-medium text-destructive"
            : "border-foreground/25 bg-muted font-medium text-foreground"
          : "border-border text-muted-foreground hover:border-foreground/25 hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
      {children}
      {count != null && (
        <span
          className={cn(
            "rounded font-mono text-[11px] tabular-nums",
            active ? "text-foreground/70" : "text-muted-foreground/70",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * pick one facet from a short, closely-related set and apply it immediately.
 * this is the real segmented-control case (primer: "pick one choice from a
 * linear set of closely related choices, and immediately apply that selection"),
 * used for things like an http method filter where "ALL" is one of the choices.
 *
 * because the options are mutually exclusive and sit in one track, the selected
 * one is a raised surface inside a recessed group - the shape carries the
 * meaning, so the ink does not have to shout. primer caps this at 5 options;
 * past that use a menu.
 */
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
      // primer: a segmented control is not a tablist/radiogroup. aria-current is
      // the announced selection.
      aria-current={active ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "press cursor-pointer rounded-[6px] px-2 py-1 text-xs transition-colors",
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
