"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateWorkspaceDialog } from "@/app/app/new/create-workspace-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

type Props = {
  current: string;
  workspaces: { id: string; name: string; slug: string }[];
};

export function WorkspaceSwitcher({ current, workspaces }: Props) {
  const router = useRouter();
  const active = workspaces.find((w) => w.slug === current || w.id === current);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent"
                aria-label="Switch workspace"
              >
                <span className="flex size-6 items-center justify-center rounded-sm bg-foreground/10 font-mono text-xs text-foreground">
                  {(active?.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium">
                    {active?.name ?? "Select workspace"}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {active?.slug ?? ""}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 opacity-60" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id} onClick={() => router.push(`/app/${w.slug}`)}>
                  <span className="flex-1 truncate">{w.name}</span>
                  {(w.slug === current || w.id === current) && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {/* open the create modal, not a full-page redirect - existing users
                  get the quick path. onSelect closes the dropdown first, then we
                  open the dialog on the next tick so focus lands cleanly in it. */}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => setCreateOpen(true), 0);
                }}
              >
                <Plus className="size-4" />
                Create workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
