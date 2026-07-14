"use client";

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

      <SidebarContent>
        {navGroups(workspace).map((group) => {
          const items = group.items.filter(
            (item) => !item.requires || can(role, item.requires.resource, item.requires.action),
          );
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
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
                          className="h-8 gap-2.5 text-[13px] data-[active=true]:font-medium"
                        >
                          <Link href={item.href}>
                            <item.icon className="size-4 opacity-80" />
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

      <SidebarFooter className="border-t p-2">
        <CreditsMeter />
      </SidebarFooter>
    </Sidebar>
  );
}

// credits balance is wired in phase 4. renders an honest $0.00 with a low-balance
// meter shell so the slot reads as a real component, not a placeholder.
function CreditsMeter() {
  return (
    <div className="rounded-md px-2 py-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Credits
        </span>
        <span className="font-mono text-xs text-muted-foreground">$0.00</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-0 bg-primary" />
      </div>
    </div>
  );
}
