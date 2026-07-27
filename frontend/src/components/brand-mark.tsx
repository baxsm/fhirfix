import { cn } from "@/lib/utils";

type Props = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

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
