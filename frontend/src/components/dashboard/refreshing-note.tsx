"use client";

import { Loader2 } from "lucide-react";
import { useDelayedFlag } from "@/lib/use-delayed-flag";

export function RefreshingNote({ active }: { active: boolean }) {
  const visible = useDelayedFlag(active);
  if (!visible) return null;

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Loader2 className="size-3 animate-spin" />
      Updating
    </span>
  );
}
