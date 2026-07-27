"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLastPresent } from "@/lib/use-last-present";
import { useTRPC } from "@/trpc/client";
import type { MappingRow, MappingVersion } from "./types";

function fmtDateTime(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MappingHistoryDialog({
  workspaceId,
  target,
  onOpenChange,
}: {
  workspaceId: string;
  target: MappingRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();

  const shown = useLastPresent(target);
  const query = useQuery({
    ...trpc.mappings.history.queryOptions({ workspaceId, mappingId: shown?.id ?? "" }),
    enabled: !!shown,
  });

  const versions = (query.data ?? []) as MappingVersion[];

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Every version of <code className="font-mono text-xs">{shown?.sourceValue}</code>. Edits
            supersede, never overwrite, so a run from any date still explains itself.
          </DialogDescription>
        </DialogHeader>

        {query.isError ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-sm text-muted-foreground">Could not load history.</p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Retry
            </Button>
          </div>
        ) : query.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <ol className="space-y-0">
            {versions.map((v, i) => {
              const current = !v.supersededById;
              return (
                <li key={v.id} className={i === versions.length - 1 ? "" : "border-b pb-3 mb-3"}>
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">v{v.version}</span>
                      {current && (
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                          current
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {fmtDateTime(v.createdAt)}
                    </span>
                  </div>
                  <code className="mt-1 block break-all font-mono text-xs text-muted-foreground">
                    {v.targetValue}
                  </code>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {v.createdBy === "system" ? "Auto-learned" : "Edited by a member"}
                    {v.status !== "active" && ` · ${v.status}`}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
