import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

// a caveat is a LINE, not a container. a bordered tinted box inside a panel
// reads as a second card and is what makes these screens feel boxed-in.
export function InlineNote({
  tone = "warning",
  className,
  children,
}: {
  tone?: "warning" | "info";
  className?: string;
  children: React.ReactNode;
}) {
  const Icon = tone === "warning" ? TriangleAlert : Info;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs",
        tone === "warning" ? "text-warning" : "text-muted-foreground",
        className,
      )}
    >
      <Icon className="mt-px size-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
