"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, TrendingDown, Wallet, Zap } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsSection } from "@/components/dashboard/settings-section";
import { Button } from "@/components/ui/button";
import { LoadError } from "@/components/ui/load-error";
import { PanelTab, PanelTabs } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrganizations } from "@/lib/auth-client";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { AddCreditsDialog } from "./add-credits-dialog";
import { BillingControls } from "./billing-controls";
import { InvoicesTable } from "./invoices-table";
import { LedgerTable } from "./ledger-table";
import { UsageChart } from "./usage-chart";

const USAGE_DAYS = 30;

export function BillingView({
  workspace,
  workspaceId: serverWorkspaceId,
}: {
  workspace: string;
  workspaceId?: string;
}) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

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

  // the ledger is credited by the order.paid webhook, which can land a moment
  // after the checkout reports success. refetch once now and once shortly after,
  // so the balance settles without the user reloading.
  const confirmPurchase = useCallback(() => {
    toast.success("Credits added to your workspace.");
    summary.refetch();
    window.setTimeout(() => summary.refetch(), 2000);
  }, [summary]);

  // the embedded checkout stays on this page, but a redirect-based return (an
  // older tab, or a wallet payment that leaves the iframe) still lands here.
  const params = useSearchParams();
  const toasted = useRef(false);
  useEffect(() => {
    if (params.get("success") === "1" && !toasted.current) {
      toasted.current = true;
      confirmPurchase();
      // drop the query param so a refresh does not re-toast.
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [params, confirmPurchase]);

  return (
    <PageContainer>
      <PageHeader
        title="Billing"
        description="Your prepaid credit balance, usage, and invoices for this workspace."
      />

      {summary.isError ? (
        <LoadError what="billing" onRetry={() => summary.refetch()} />
      ) : summary.isPending || !workspaceId ? (
        <BillingSkeleton />
      ) : (
        <>
          <BalanceHero
            workspaceId={workspaceId}
            canManage={canManage}
            summary={summary.data}
            onPurchased={confirmPurchase}
          />

          <SettingsSection
            title="Usage"
            description={`Credits spent per day over the last ${USAGE_DAYS} days, by source.`}
          >
            <UsageSection workspaceId={workspaceId} />
          </SettingsSection>

          {canManage && (
            <BillingControls
              workspaceId={workspaceId}
              autoRecharge={summary.data.autoRecharge}
              spendCap={summary.data.spendCap}
              packs={summary.data.packs}
              onSaved={() => summary.refetch()}
            />
          )}

          <HistorySection workspaceId={workspaceId} />
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
  plan: { tier: string; premiumLabel: string; purchasable: boolean };
};

function BalanceHero({
  workspaceId,
  canManage,
  summary,
  onPurchased,
}: {
  workspaceId: string;
  canManage: boolean;
  summary: Summary;
  onPurchased: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const low = summary.balanceDollars <= 1;

  return (
    <section className="raised overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wallet className="size-3.5" />
            Balance
            {summary.isTrial && (
              <span className="rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[0.75rem] font-medium text-success">
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
          {/* a near-zero burn rate projects absurd runways, so cap the phrasing above 90 days */}
          <p className="text-xs text-muted-foreground">
            Covers about{" "}
            <span className="font-mono tabular-nums text-foreground">
              {summary.resourcesRemaining.toLocaleString()}
            </span>{" "}
            more resources
            {summary.daysRemaining != null &&
              (summary.daysRemaining > 90 ? (
                <>, more than three months at this pace</>
              ) : (
                <>
                  , about{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {summary.daysRemaining}
                  </span>{" "}
                  days at this pace
                </>
              ))}
          </p>
        </div>

        {canManage && (
          <Button size="lg" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add credits
          </Button>
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

      <div className="border-t">
        <PlanRow workspaceId={workspaceId} plan={summary.plan} canManage={canManage} />
      </div>

      <AddCreditsDialog
        workspaceId={workspaceId}
        packs={summary.packs}
        open={addOpen}
        onOpenChange={setAddOpen}
        billingConfigured={summary.billingConfigured}
        onPurchased={onPurchased}
      />
    </section>
  );
}

function PlanRow({
  workspaceId,
  plan,
  canManage,
}: {
  workspaceId: string;
  plan: { tier: string; premiumLabel: string; purchasable: boolean };
  canManage: boolean;
}) {
  const trpc = useTRPC();
  const isPremium = plan.tier === "premium";
  const upgrade = useMutation(
    trpc.billing.upgradeToPremium.mutationOptions({
      onSuccess: ({ url }) => {
        window.location.href = url;
      },
      onError: (e) => toast.error(e.message ?? "Could not start checkout."),
    }),
  );

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{isPremium ? "Premium" : "Free"}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isPremium
            ? "Conformance packets, audit trail, and priority validator capacity."
            : "Runs and mapping rules. Conformance packets need Premium."}
        </p>
      </div>
      {!isPremium && canManage && plan.purchasable && (
        <Button
          size="sm"
          className="shrink-0"
          disabled={upgrade.isPending}
          onClick={() => upgrade.mutate({ workspaceId })}
        >
          {upgrade.isPending ? "Opening checkout..." : `Upgrade for ${plan.premiumLabel}/mo`}
        </Button>
      )}
    </div>
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
  return (
    <div className="min-w-0 px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
        <Icon className="size-3 shrink-0" />
        {label}
      </div>
      <div className="mt-1 font-mono text-lg tabular-nums leading-none">{value}</div>
      <p className="mt-1 truncate text-[0.6875rem] text-muted-foreground/70">{hint}</p>
    </div>
  );
}

// invoices and the ledger answer the same question - where did the money go -
// so they share one panel instead of stacking two identical ones
function HistorySection({ workspaceId }: { workspaceId: string }) {
  const [tab, setTab] = useState<"invoices" | "ledger">("invoices");

  return (
    <section className="raised flex flex-col overflow-hidden rounded-lg border bg-card">
      <div className="px-4 pt-3">
        <PanelTabs label="Billing history">
          <PanelTab active={tab === "invoices"} onClick={() => setTab("invoices")}>
            Invoices
          </PanelTab>
          <PanelTab active={tab === "ledger"} onClick={() => setTab("ledger")}>
            Ledger
          </PanelTab>
        </PanelTabs>
      </div>
      <div className="px-5 py-3.5">
        <p className="pb-2 text-xs text-muted-foreground">
          {tab === "invoices"
            ? "Every credit purchase, newest first."
            : "Every credit movement: grants, purchases, and per-run debits."}
        </p>
        {tab === "invoices" ? (
          <InvoicesTable workspaceId={workspaceId} />
        ) : (
          <LedgerTable workspaceId={workspaceId} />
        )}
      </div>
    </section>
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
