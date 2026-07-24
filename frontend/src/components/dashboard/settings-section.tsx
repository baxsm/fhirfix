import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * one bordered panel per section, dividers inside for grouping.
 *
 * the icon is deliberately NOT in its own bordered tile. a bordered box inside
 * a bordered card is card-in-card, and repeating that on every section header
 * is what makes a page read as assembled from a template rather than designed.
 * the icon now sits inline at text scale, in muted ink, where it labels the
 * heading instead of decorating it.
 *
 * `slim` is gone: it existed because the full header was too heavy for a short
 * section. the header is now light enough for both, so there is one shape.
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  actions,
  flush,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** right-aligned controls belonging to the section as a whole. */
  actions?: React.ReactNode;
  /** content owns its own padding (for tables that bleed to the panel edge). */
  flush?: boolean;
  children: React.ReactNode;
}) {
  // flex column + h-full: when two of these sit side by side in a grid, the
  // shorter one is stretched to match its neighbour. without this the content
  // stayed top-aligned and left a dead gap at the bottom of the card.
  return (
    <section className="raised flex h-full flex-col overflow-hidden rounded-lg border bg-card">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0 space-y-0.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold leading-tight">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            {title}
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div className={cn("flex-1", flush ? "" : "px-4 py-3.5")}>{children}</div>
    </section>
  );
}

/**
 * a labelled setting row: description left, control right. keeps a small
 * control from looking stranded in a large empty panel.
 */
export function SettingRow({
  label,
  hint,
  muted,
  children,
}: {
  label: string;
  hint: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between [&:not(:last-child)]:border-b">
      <div className="min-w-0 space-y-0.5">
        <p className={cn("text-sm font-medium", muted && "text-muted-foreground")}>{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
