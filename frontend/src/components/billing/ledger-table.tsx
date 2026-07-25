"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type LedgerType = "purchase" | "debit" | "grant" | "refund" | "expiry" | "adjustment";

const TYPE_LABEL: Record<LedgerType, string> = {
  purchase: "Purchase",
  debit: "Run",
  grant: "Grant",
  refund: "Refund",
  expiry: "Expiry",
  adjustment: "Adjustment",
};

const PAGE_SIZE = 12;

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * the backend describes a run debit as "Run run_xxx (1 resource)". with the
 * type label already reading "Run", the row rendered "Run / Run run_xxx (1
 * resource)" - the word three times. strip the redundant lead-in so the second
 * line carries only what the label does not already say.
 */
function detailLine(type: LedgerType, description: string): string {
  const label = TYPE_LABEL[type];
  const trimmed = description.replace(new RegExp(`^${label}\\s+`, "i"), "");
  return trimmed || description;
}

export function LedgerTable({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const [page, setPage] = useState(0);

  const query = useQuery({
    ...trpc.billing.ledger.queryOptions({
      workspaceId,
      // one extra row tells us whether another page exists without a count query.
      limit: PAGE_SIZE + 1,
      offset: page * PAGE_SIZE,
    }),
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
  });

  if (query.isPending) return <Skeleton className="h-40 w-full" />;
  if (query.isError)
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">Could not load the ledger.</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  if (query.data.length === 0 && page === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No credit activity yet. Grants, purchases, and run debits will appear here.
      </p>
    );

  const hasMore = query.data.length > PAGE_SIZE;
  const rows = hasMore ? query.data.slice(0, PAGE_SIZE) : query.data;

  return (
    <div>
      <div className={cn("overflow-x-auto", query.isPlaceholderData && "is-stale")}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2 font-medium">Entry</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 text-right font-medium">Balance</th>
              <th className="px-4 py-2 text-right font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isCredit = r.amountDollars >= 0;
              const type = r.type as LedgerType;
              return (
                <tr key={r.id} className="row-interactive border-b last:border-0 hover:bg-accent">
                  <td className="px-4 py-2.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{TYPE_LABEL[type]}</span>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {detailLine(type, r.description)}
                      </span>
                    </div>
                  </td>
                  {/* money in is emerald, money out is plain ink. a debit is the
                      expected state of a metered product, not a warning. */}
                  <td
                    className={cn(
                      "px-4 py-2.5 text-right font-mono text-xs tabular-nums whitespace-nowrap",
                      isCredit ? "text-success" : "text-foreground",
                    )}
                  >
                    {isCredit ? "+" : "-"}${Math.abs(r.amountDollars).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                    ${r.balanceAfterDollars.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs whitespace-nowrap text-muted-foreground">
                    {fmtDate(r.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(hasMore || page > 0) && (
        <div className="flex items-center justify-between gap-3 border-t px-4 py-2.5">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {page * PAGE_SIZE + 1}-{page * PAGE_SIZE + rows.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || query.isPlaceholderData}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore || query.isPlaceholderData}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
