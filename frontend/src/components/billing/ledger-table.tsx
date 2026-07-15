"use client";

import { useQuery } from "@tanstack/react-query";
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

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LedgerTable({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.billing.ledger.queryOptions({ workspaceId, limit: 50, offset: 0 }),
    enabled: !!workspaceId,
  });

  if (query.isPending) return <Skeleton className="h-40 w-full" />;
  if (query.isError)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Could not load the ledger.</p>
    );
  if (query.data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No credit activity yet. Grants, purchases, and run debits will appear here.
      </p>
    );

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-5 py-2 font-medium">Entry</th>
            <th className="px-5 py-2 text-right font-medium">Amount</th>
            <th className="px-5 py-2 text-right font-medium">Balance</th>
            <th className="px-5 py-2 text-right font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {query.data.map((r) => {
            const isCredit = r.amountDollars >= 0;
            return (
              <tr key={r.id} className="border-b last:border-0">
                <td className="px-5 py-2.5">
                  <div className="flex flex-col">
                    <span className="font-medium">{TYPE_LABEL[r.type as LedgerType]}</span>
                    <span className="truncate text-xs text-muted-foreground">{r.description}</span>
                  </div>
                </td>
                <td
                  className={cn(
                    "px-5 py-2.5 text-right font-mono text-xs tabular-nums",
                    isCredit ? "text-primary" : "text-foreground",
                  )}
                >
                  {isCredit ? "+" : "-"}${Math.abs(r.amountDollars).toFixed(2)}
                </td>
                <td className="px-5 py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  ${r.balanceAfterDollars.toFixed(2)}
                </td>
                <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">
                  {fmtDate(r.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
