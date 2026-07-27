"use client";

import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTRPC } from "@/trpc/client";

export function LowBalanceBanner({
  workspace,
  workspaceId,
}: {
  workspace: string;
  workspaceId: string;
}) {
  const trpc = useTRPC();
  const pathname = usePathname();
  const summary = useQuery({
    ...trpc.billing.summary.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });

  const balance = summary.data?.balanceDollars;
  const onBilling = pathname.endsWith("/billing");
  if (balance == null || balance > 1 || onBilling) return null;

  const empty = balance <= 0;
  return (
    <div className="flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-5 py-2 text-xs text-warning sm:px-7">
      <TriangleAlert className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1">
        {empty
          ? "Your credit balance is empty. New checks are paused until you add credits."
          : "Your credit balance is running low."}
      </span>
      <Link
        href={`/app/${workspace}/billing`}
        className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
      >
        Add credits
      </Link>
    </div>
  );
}
