"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { activeNavItem, navGroups } from "./nav-items";
import { WorkspaceSwitcher } from "./workspace-switcher";

type Props = {
  workspace: string;
  role: WorkspaceRole;
  workspaces: { id: string; name: string; slug: string }[];
};

export function AppSidebar({ workspace, role, workspaces }: Props) {
  const pathname = usePathname();
  const active = workspaces.find((w) => w.slug === workspace || w.id === workspace);
  const workspaceId = active?.id ?? "";
  // one shared matcher with the breadcrumb, so a drill-in page keeps its
  // section highlighted and the two can never drift.
  const activeHref = activeNavItem(workspace, pathname)?.href;

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-2">
        <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        {navGroups(workspace).map((group, gi) => {
          const items = group.items.filter(
            (item) => !item.requires || can(role, item.requires.resource, item.requires.action),
          );
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label} className={gi === 0 ? "p-0" : "mt-6 p-0"}>
              <SidebarGroupLabel className="h-auto px-2 pb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {/* gap-1 between rows + rounded inset pills = rows breathe and a
                    hover no longer bleeds into its neighbor. */}
                <SidebarMenu className="gap-1">
                  {items.map((item) => {
                    const active = activeHref === item.href;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          className="relative h-8 gap-2.5 rounded-md px-2 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-[active=true]:bg-foreground/[0.07] data-[active=true]:font-medium data-[active=true]:text-foreground"
                        >
                          <Link href={item.href}>
                            {/* active row = a neutral elevation fill + white text
                                (Linear/Vercel). no colored bar: color is reserved
                                for meaning, chrome stays neutral. */}
                            <item.icon
                              className={
                                active
                                  ? "size-4 text-foreground"
                                  : "size-4 text-muted-foreground/70"
                              }
                            />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <CreditsMeter workspace={workspace} workspaceId={workspaceId} />
      </SidebarFooter>
    </Sidebar>
  );
}

// live credits balance. a distinct inset card (one step above the sidebar surface
// + hairline border) so it reads as a deliberate element, not rail chrome. it is
// the only bordered thing in the borderless sidebar, so no card-in-card. the meter
// fills against a $10 comfortable baseline and turns amber when the balance is low.
const METER_BASELINE_DOLLARS = 10;
function CreditsMeter({ workspace, workspaceId }: { workspace: string; workspaceId: string }) {
  const trpc = useTRPC();
  const summary = useQuery({
    ...trpc.billing.summary.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
    // keep the meter roughly fresh as runs debit, without hammering the backend.
    refetchInterval: 30_000,
  });

  const balance = summary.data?.balanceDollars ?? null;
  const low = balance != null && balance <= 1;
  const empty = balance != null && balance <= 0;
  const fillPct =
    balance != null ? Math.max(0, Math.min(100, (balance / METER_BASELINE_DOLLARS) * 100)) : 0;

  return (
    <Link
      href={`/app/${workspace}/billing`}
      className="raised block rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent"
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <Wallet className="size-3.5" />
          Credits
        </span>
        <span
          className={cn(
            "font-mono text-xs font-medium tabular-nums",
            low ? "text-warning" : "text-foreground",
          )}
        >
          {balance != null ? `$${balance.toFixed(2)}` : "—"}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            empty ? "bg-warning/60" : low ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground/70">
        {empty
          ? "Add credits to run checks"
          : low
            ? "Running low — top up soon"
            : "Balance for this workspace"}
      </p>
    </Link>
  );
}
