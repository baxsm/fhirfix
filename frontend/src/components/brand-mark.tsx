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

// the wordmark IS the logo. name-only "FHIRfix" set in Geist Sans, with a single
// violet dot ("FHIRfix.") as the mark. the dot uses --brand — a hue deliberately
// distinct from success(emerald) and interactive(blue) so it reads as brand, not a
// status. the favicon reduces to "f.".
export function BrandMark({ size = "sm", className }: Props) {
  return (
    <span
      className={cn(
        "select-none font-semibold tracking-tight text-foreground",
        sizeClass[size],
        className,
      )}
    >
      FHIRfix<span className="text-brand">.</span>
    </span>
  );
}
