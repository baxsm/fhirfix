import { cn } from "@/lib/utils";

/**
 * every dashboard page opens with this. before, each page hand-rolled its own
 * header with slightly different sizes and spacing, which is why the app read
 * as six pages built by six people.
 *
 * actions sit on the same baseline as the title and shrink-0 so a long
 * description can never push a button off the row.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
