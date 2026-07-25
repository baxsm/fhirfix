"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CreditCard, Receipt, TrendingDown, Wallet, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/dashboard/page-container";
import { SettingsSection } from "@/components/dashboard/settings-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrganizations } from "@/lib/auth-client";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { AutoRechargeForm } from "./auto-recharge-form";
import { InvoicesTable } from "./invoices-table";
import { LedgerTable } from "./ledger-table";
import { SpendCapForm } from "./spend-cap-form";
import { UsageChart } from "./usage-chart";

const USAGE_DAYS = 30;

export function BillingView({ workspace }: { workspace: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  const trpc = useTRPC();
  const summary = useQuery({
    ...trpc.billing.summary.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });
  const wsQuery = useQuery({
    ...trpc.workspace.get.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });
  const role = (wsQuery.data?.role ?? "member") as WorkspaceRole;
  const canManage = can(role, "billing", "manage");

  // returning from a Polar checkout: confirm and refetch the balance.
  const params = useSearchParams();
  const toasted = useRef(false);
  useEffect(() => {
    if (params.get("success") === "1" && !toasted.current) {
      toasted.current = true;
      toast.success("Credits added to your workspace.");
      summary.refetch();
      // drop the query param so a refresh does not re-toast.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [params, summary]);

  return (
    <PageContainer>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Your prepaid credit balance, usage, and invoices for{" "}
          <span className="font-medium text-foreground">{active?.name ?? "this workspace"}</span>.
        </p>
      </header>

      {summary.isError ? (
        <SectionError onRetry={() => summary.refetch()} />
      ) : summary.isPending || !workspaceId ? (
        <BillingSkeleton />
      ) : (
        <>
          <BalanceHero workspaceId={workspaceId} canManage={canManage} summary={summary.data} />

          <SettingsSection
            icon={TrendingDown}
            title="Usage"
            description={`Credits spent per day over the last ${USAGE_DAYS} days, by source.`}
          >
            <UsageSection workspaceId={workspaceId} />
          </SettingsSection>

          {canManage && (
            <div className="grid gap-6 md:grid-cols-2">
              <AutoRechargeForm
                workspaceId={workspaceId}
                autoRecharge={summary.data.autoRecharge}
                packs={summary.data.packs}
                onSaved={() => summary.refetch()}
              />
              <SpendCapForm
                workspaceId={workspaceId}
                spendCap={summary.data.spendCap}
                onSaved={() => summary.refetch()}
              />
            </div>
          )}

          <SettingsSection
            icon={Receipt}
            title="Invoices"
            description="Every credit purchase, newest first."
          >
            <InvoicesTable workspaceId={workspaceId} />
          </SettingsSection>

          <SettingsSection
            icon={Wallet}
            title="Ledger"
            description="Every credit movement: grants, purchases, and per-run debits."
            flush
          >
            <LedgerTable workspaceId={workspaceId} />
          </SettingsSection>
        </>
      )}
    </PageContainer>
  );
}

type Summary = {
  balanceDollars: number;
  resourcesRemaining: number;
  dailyBurnDollars: number;
  estimatedMonthlyDollars: number;
  daysRemaining: number | null;
  isTrial: boolean;
  billingConfigured: boolean;
  packs: { id: string; label: string; cents: number }[];
};

function BalanceHero({
  workspaceId,
  canManage,
  summary,
}: {
  workspaceId: string;
  canManage: boolean;
  summary: Summary;
}) {
  const trpc = useTRPC();
  const [pendingPack, setPendingPack] = useState<string | null>(null);
  const low = summary.balanceDollars <= 1;

  const checkout = useMutation(
    trpc.billing.checkout.mutationOptions({
      onSuccess: ({ url }) => {
        // hand off to Polar's hosted checkout.
        window.location.href = url;
      },
      onError: (e) => {
        setPendingPack(null);
        toast.error(e.message ?? "Could not start checkout.");
      },
    }),
  );

  return (
    <section className="raised overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wallet className="size-3.5" />
            Balance
            {summary.isTrial && (
              <span className="rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
                trial credits
              </span>
            )}
          </div>
          <div
            className={cn(
              "font-mono text-4xl font-semibold tabular-nums tracking-tight",
              low ? "text-warning" : "text-foreground",
            )}
          >
            ${summary.balanceDollars.toFixed(2)}
          </div>
          {/* a runway projected off a near-zero burn rate produces numbers like
              "11973 days", which is 32 years and reads as broken. past a
              quarter the figure is meaningless, so say the useful thing
              instead of printing a precise absurdity. */}
          <p className="text-xs text-muted-foreground">
            covers about{" "}
            <span className="font-mono tabular-nums text-foreground">
              {summary.resourcesRemaining.toLocaleString()}
            </span>{" "}
            more resources
            {summary.daysRemaining != null &&
              (summary.daysRemaining > 90 ? (
                <> · months of runway at this pace</>
              ) : (
                <>
                  {" · "}~
                  <span className="font-mono tabular-nums text-foreground">
                    {summary.daysRemaining}
                  </span>{" "}
                  days at current pace
                </>
              ))}
          </p>
        </div>

        {canManage && (
          <div className="space-y-2">
            <p className="text-right text-[11px] text-muted-foreground">Add credits</p>
            <div className="flex gap-2">
              {summary.packs.map((p) => (
                <Button
                  key={p.id}
                  variant={low && p.id === "pack_25" ? "success" : "outline"}
                  size="sm"
                  disabled={checkout.isPending}
                  onClick={() => {
                    setPendingPack(p.id);
                    checkout.mutate({ workspaceId, packId: p.id });
                  }}
                  className="font-mono tabular-nums"
                >
                  {pendingPack === p.id && checkout.isPending ? "..." : p.label}
                </Button>
              ))}
            </div>
            {!summary.billingConfigured && (
              <p className="max-w-[16rem] text-right text-[11px] text-muted-foreground">
                Checkout is not connected yet. You are running on granted credits.
              </p>
            )}
          </div>
        )}
      </div>

      {/* burn + projection tiles, flush divider list (no card-in-card). */}
      <div className="grid grid-cols-1 divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <HeroTile
          icon={TrendingDown}
          label="Daily burn (30d avg)"
          value={`$${summary.dailyBurnDollars.toFixed(2)}`}
          hint="average credits spent per day"
        />
        <HeroTile
          icon={Zap}
          label="Projected this month"
          value={`$${summary.estimatedMonthlyDollars.toFixed(2)}`}
          hint="at your current pace"
        />
      </div>
    </section>
  );
}

function HeroTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  hint: string;
}) {
  // the label leads and the number is the largest thing in the tile, because
  // the number is what is being read. the previous version buried a 14px value
  // beside a bordered icon chip that carried no information.
  return (
    <div className="min-w-0 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3 shrink-0" />
        {label}
      </div>
      <div className="mt-1 font-mono text-lg tabular-nums leading-none">{value}</div>
      <p className="mt-1 truncate text-[11px] text-muted-foreground/70">{hint}</p>
    </div>
  );
}

function UsageSection({ workspaceId }: { workspaceId: string }) {
  const trpc = useTRPC();
  const usage = useQuery({
    ...trpc.billing.usage.queryOptions({ workspaceId, days: USAGE_DAYS }),
    enabled: !!workspaceId,
  });

  if (usage.isPending) return <Skeleton className="h-56 w-full" />;
  if (usage.isError)
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Could not load usage.
      </div>
    );
  return <UsageChart rows={usage.data} days={USAGE_DAYS} />;
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="raised flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
      <CreditCard className="size-8 text-muted-foreground" />
      <h2 className="font-medium">Could not load billing</h2>
      <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
