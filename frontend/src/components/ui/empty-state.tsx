import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  nested,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  nested?: boolean;
  className?: string;
}) {
  // nested drops the icon and body: the section header above already carries both
  if (nested) {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 py-7 text-center sm:flex-row sm:justify-center sm:gap-4 sm:text-left",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">{title}</p>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center", className)}>
      {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight">{title}</p>
        {body && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
