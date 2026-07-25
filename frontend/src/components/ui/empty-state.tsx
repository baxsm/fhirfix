import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * the empty state for a panel that sits among populated panels.
 *
 * a full-page empty state (big centred icon, lots of vertical air) is right
 * when the empty thing IS the page. inside a section on a page that already has
 * content, that treatment reads as a hole - a ~250px void between two working
 * panels. this one is left-aligned, compact, and puts its action on the same
 * row, so an empty section looks deliberate rather than broken.
 *
 * it carries NO border. every caller renders it inside SettingsSection, which
 * is already `rounded-lg border`, so a dashed box here drew a box inside a box.
 * the panel is the container; this is just its contents.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center",
        className,
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
