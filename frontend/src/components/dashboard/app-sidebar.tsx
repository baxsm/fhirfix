"use client";

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
import { navGroups } from "./nav-items";
import { WorkspaceSwitcher } from "./workspace-switcher";

type Props = {
  workspace: string;
  role: WorkspaceRole;
  workspaces: { id: string; name: string; slug: string }[];
};

export function AppSidebar({ workspace, role, workspaces }: Props) {
  const pathname = usePathname();

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
                    const active =
                      item.href === `/app/${workspace}`
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
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
        <CreditsMeter workspace={workspace} />
      </SidebarFooter>
    </Sidebar>
  );
}

// credits balance is wired in phase 4. renders an honest $0.00 with a low-balance
// meter shell so the slot reads as a real component, not a placeholder.
// this is a distinct inset card (one step above the sidebar surface + hairline
// border) so it reads as a deliberate element, not part of the rail chrome. it
// is the only bordered thing in the borderless sidebar, so no card-in-card.
function CreditsMeter({ workspace }: { workspace: string }) {
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
        <span className="font-mono text-xs font-medium tabular-nums text-foreground">$0.00</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-0 rounded-full bg-foreground/40" />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground/70">Add credits to run checks</p>
    </Link>
  );
}
