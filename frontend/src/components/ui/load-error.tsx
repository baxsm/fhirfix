import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// the one failed-to-load panel; `what` names the thing so copy stays specific
export function LoadError({
  what,
  onRetry,
  className,
}: {
  what: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "raised flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-14 text-center",
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-sm font-medium">Could not load {what}</h2>
        <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
