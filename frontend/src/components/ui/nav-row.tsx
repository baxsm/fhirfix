"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// selection is the violet wash, never a filled action colour and never a left rail
export function NavRow({
  active,
  className,
  children,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-primary-subtle font-medium text-primary-subtle-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
