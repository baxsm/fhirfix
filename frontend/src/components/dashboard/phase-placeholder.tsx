import type { LucideIcon } from "lucide-react";

// honest placeholder for routes whose feature lands in a later phase.
// names what the screen will do so navigating the app feels intentional,
// not fake data, not a dead end (writing.md product-honesty).
export function PhasePlaceholder({
  title,
  phase,
  icon: Icon,
  description,
}: {
  title: string;
  phase: string;
  icon: LucideIcon;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </header>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-14 text-center">
        <span className="flex size-9 items-center justify-center rounded-md border bg-card">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">Not built yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            The foundation, auth, and dashboard shell are in place. This surface arrives in{" "}
            <span className="font-mono text-foreground">{phase}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
