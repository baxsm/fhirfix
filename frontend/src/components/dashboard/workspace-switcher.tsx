"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent"
              aria-label="Switch workspace"
            >
              <span className="flex size-6 items-center justify-center rounded-sm bg-primary/15 font-mono text-xs text-primary">
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
            <DropdownMenuItem asChild>
              <Link href="/app/new">
                <Plus className="size-4" />
                Create workspace
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
