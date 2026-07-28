"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const activeHref = activeNavItem(workspace, pathname)?.href;

  return (
    <aside className="hidden w-[212px] shrink-0 flex-col overflow-hidden rounded-xl border bg-sidebar shadow-[0_1px_2px_0_oklch(0.145_0_0/0.05),0_8px_20px_-10px_oklch(0.145_0_0/0.12)] md:flex">
      <div className="p-2.5">
        <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-2">
        {navGroups(workspace).map((group, gi) => {
          const items = group.items.filter(
            (item) => !item.requires || can(role, item.requires.resource, item.requires.action),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label} className={gi === 0 ? "" : "mt-5"}>
              <p className="px-2 pb-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.11em] text-muted-foreground/70">
                {group.label}
              </p>
              {/* gap-1.5, not gap-0.5: at 2px an active chip sits flush against a hovered neighbour */}
              <ul className="flex flex-col gap-1.5">
                {items.map((item) => {
                  const active = activeHref === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "row-interactive flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13px]",
                          active
                            ? "bg-sidebar-primary font-medium text-sidebar-primary-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-sidebar-primary-foreground" : "text-muted-foreground",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t p-2.5">
        <CreditsMeter workspace={workspace} workspaceId={workspaceId} />
      </div>
    </aside>
  );
}

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
      className="row-interactive -mx-1 block rounded-lg px-2 py-1.5 hover:bg-sidebar-accent"
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
            empty ? "bg-warning/60" : low ? "bg-warning" : "bg-success",
          )}
          style={{ width: `${fillPct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground/70">
        {empty
          ? "Add credits to run checks"
          : low
            ? "Running low, top up soon"
            : "Balance for this workspace"}
      </p>
    </Link>
  );
}
