import { Suspense } from "react";
import { BillingView } from "@/components/billing/billing-view";
import { Skeleton } from "@/components/ui/skeleton";

export default async function BillingPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  // BillingView reads searchParams (?success=1 from Polar), so it needs a Suspense
  // boundary under the App Router.
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-64 max-w-5xl rounded-xl" />}>
      <BillingView workspace={workspace} />
    </Suspense>
  );
}
