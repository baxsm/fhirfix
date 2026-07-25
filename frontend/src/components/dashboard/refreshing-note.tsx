"use client";

import { Loader2 } from "lucide-react";
import { useDelayedFlag } from "@/lib/use-delayed-flag";

/**
 * a background refetch, shown next to the data instead of replacing it.
 *
 * tanstack draws the line we need: `pending` means no data yet (a skeleton is
 * right), `isFetching` means data is on screen and being refreshed (a skeleton
 * is wrong - it reads as the records being wiped, which in a compliance product
 * looks like data loss).
 *
 * see tanstack.com/query/latest/docs/framework/react/guides/background-fetching-indicators
 */
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
