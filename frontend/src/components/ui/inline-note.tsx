import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "warning" | "info" | "critical";

const TONE: Record<Tone, { text: string; fill: string }> = {
  warning: { text: "text-warning", fill: "bg-warning/[0.07]" },
  info: { text: "text-muted-foreground", fill: "bg-muted/60" },
  critical: { text: "text-destructive", fill: "bg-destructive/[0.06]" },
};

// per primer's Banner guidelines: inside a card, dialog or table a banner is
// FLUSH - full bleed to the container edge with no border or radius of its own,
// so it never reads as a second box. `-mx` values must match the parent padding.
export function InlineNote({
  tone = "warning",
  flush = false,
  className,
  children,
}: {
  tone?: Tone;
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONE[tone];
  const Icon = tone === "info" ? Info : TriangleAlert;
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-xs",
        t.text,
        flush && cn("-mx-4 px-4 py-2", t.fill),
        className,
      )}
    >
      <Icon className="mt-px size-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
