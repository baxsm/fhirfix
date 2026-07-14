"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { navItems } from "./nav-items";
import { WorkspaceSwitcher } from "./workspace-switcher";

type Props = {
  workspace: string;
  role: WorkspaceRole;
  workspaces: { id: string; name: string; slug: string }[];
};

export function AppSidebar({ workspace, role, workspaces }: Props) {
  const pathname = usePathname();
  const items = navItems(workspace).filter(
    (item) => !item.requires || can(role, item.requires.resource, item.requires.action),
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active =
                  item.href === `/app/${workspace}`
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* credits balance is wired in phase 4; placeholder keeps the slot honest. */}
        <div className="rounded-md border p-3">
          <p className="font-mono text-xs text-muted-foreground">Credits</p>
          <p className="font-mono text-sm tabular-nums">$0.00</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
