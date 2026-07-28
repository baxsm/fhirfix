"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PendingRows } from "@/components/ui/pending-rows";
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

  if (query.isError)
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">Could not load the ledger.</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  if (!query.isPending && query.data.length === 0 && page === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No credit activity yet. Grants, purchases, and run debits will appear here.
      </p>
    );

  const entries = query.data ?? [];
  const hasMore = entries.length > PAGE_SIZE;
  const rows = hasMore ? entries.slice(0, PAGE_SIZE) : entries;

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
          {query.isPending ? (
            <PendingRows columns={4} />
          ) : (
            <tbody key={page} className="enter-stagger">
              {rows.map((r) => {
                const isCredit = r.amountDollars >= 0;
                const type = r.type as LedgerType;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium">{TYPE_LABEL[type]}</span>
                        <span className="truncate font-mono text-[11px] text-muted-foreground">
                          {detailLine(type, r.description)}
                        </span>
                      </div>
                    </td>
                    {/* money in is emerald, money out is plain ink */}
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
          )}
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
              disabled={query.isPlaceholderData}
              aria-disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={query.isPlaceholderData}
              aria-disabled={!hasMore}
              onClick={() => hasMore && setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
