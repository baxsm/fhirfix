import { BillingView } from "@/components/billing/billing-view";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";

// the prefetch key must match LedgerTable's exactly or the client refetches on mount
const LEDGER_PAGE_SIZE = 12;
const USAGE_DAYS = 30;

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { workspace } = await params;
  const { success } = await searchParams;
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
      <BillingView
        workspace={workspace}
        workspaceId={workspaceId}
        returnedFromCheckout={success === "1"}
      />
    </HydrateClient>
  );
}
