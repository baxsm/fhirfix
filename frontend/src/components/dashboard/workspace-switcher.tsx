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
      <div>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* a plain button, since SidebarMenuButton needs a SidebarProvider this tree does not have */}
              <button
                type="button"
                aria-label="Switch workspace"
                className="press flex w-full cursor-pointer items-center gap-2 rounded-lg bg-muted/60 px-2 py-1.5 text-left hover:bg-muted data-[state=open]:bg-muted"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-[11px] text-primary-foreground">
                  {(active?.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-[13px] font-medium">
                    {active?.name ?? "Select workspace"}
                  </span>
                  <span className="truncate font-mono text-[10px] text-muted-foreground">
                    {active?.slug ?? ""}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-3.5 shrink-0 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id} onClick={() => router.push(`/app/${w.slug}`)}>
                  <span className="flex-1 truncate">{w.name}</span>
                  {(w.slug === current || w.id === current) && <Check className="size-4" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {/* open the create modal, not a full-page redirect - existing users get the quick path */}
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
        </div>
      </div>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
