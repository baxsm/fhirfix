import { cn } from "@/lib/utils";

type Props = {
  // sm = topbar / sidebar / inline chrome, md = auth + landing header,
  // lg = onboarding hero. controls only the type size, nothing else.
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

// the wordmark IS the logo. name-only, no separate glyph. "fix" carries the
// emerald = conformant meaning (the product's promise: red broken -> green fixed).
// rendered as live Geist Mono text so it stays crisp at every size and inherits
// the slashed-zero/tight-tracking system the rest of the chrome uses.
export function BrandMark({ size = "sm", className }: Props) {
  return (
    <span
      className={cn(
        "font-mono font-semibold tracking-tight text-foreground select-none",
        sizeClass[size],
        className,
      )}
    >
      FHIR<span className="text-primary">fix</span>
    </span>
  );
}
