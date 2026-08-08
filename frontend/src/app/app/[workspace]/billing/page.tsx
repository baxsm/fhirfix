import { Suspense } from "react";
import { BillingView } from "@/components/billing/billing-view";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";

// the prefetch key must match LedgerTable's exactly or the client refetches on mount
const LEDGER_PAGE_SIZE = 12;
const USAGE_DAYS = 30;

export default async function BillingPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    prefetch(trpcServer.billing.summary.queryOptions({ workspaceId }));
    prefetch(trpcServer.billing.usage.queryOptions({ workspaceId, days: USAGE_DAYS }));
    prefetch(trpcServer.billing.invoices.queryOptions({ workspaceId }));
    prefetch(
      trpcServer.billing.ledger.queryOptions({
        workspaceId,
        limit: LEDGER_PAGE_SIZE + 1,
        offset: 0,
      }),
    );
  }

  return (
    <HydrateClient>
      {/* BillingView reads ?success=1 with useSearchParams, which needs a boundary */}
      <Suspense fallback={<Skeleton className="mx-auto h-64 max-w-5xl rounded-xl" />}>
        <BillingView workspace={workspace} workspaceId={workspaceId} />
      </Suspense>
    </HydrateClient>
  );
}
