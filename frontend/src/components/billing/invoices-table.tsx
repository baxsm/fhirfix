"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type InvoiceStatus = "draft" | "open" | "paid" | "void";

const STATUS_TONE: Record<InvoiceStatus, string> = {
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  open: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  draft: "border-muted bg-muted/40 text-muted-foreground",
  void: "border-muted bg-muted/40 text-muted-foreground line-through",
};

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InvoicesTable({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.billing.invoices.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  if (query.isPending) return <Skeleton className="h-24 w-full" />;
  // a failed load gets a way out, like the ledger on this same page does. a
  // sentence with no action reads as a permanent state rather than a retryable
  // one, and these two panels sitting side by side made the difference obvious.
  if (query.isError)
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-muted-foreground">Could not load invoices.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          Retry
        </Button>
      </div>
    );
  if (query.data.length === 0)
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No purchases yet. Buy credits and your invoices will show up here.
      </p>
    );

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-5 py-2 font-medium">Invoice</th>
            <th className="px-5 py-2 font-medium">Status</th>
            <th className="px-5 py-2 text-right font-medium">Credits</th>
            <th className="px-5 py-2 text-right font-medium">Amount</th>
            <th className="px-5 py-2 text-right font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {query.data.map((inv) => (
            <tr key={inv.id} className="border-b last:border-0">
              <td className="px-5 py-2.5 font-mono text-xs">{inv.id}</td>
              <td className="px-5 py-2.5">
                <Badge
                  variant="outline"
                  className={cn("capitalize", STATUS_TONE[inv.status as InvoiceStatus])}
                >
                  {inv.status}
                </Badge>
              </td>
              <td className="px-5 py-2.5 text-right font-mono text-xs tabular-nums">
                ${(inv.creditsPurchasedMicro / 1_000_000).toFixed(2)}
              </td>
              <td className="px-5 py-2.5 text-right font-mono text-xs tabular-nums">
                ${(inv.amountCents / 100).toFixed(2)}
              </td>
              <td className="px-5 py-2.5 text-right text-xs text-muted-foreground">
                {fmtDate(inv.issuedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
