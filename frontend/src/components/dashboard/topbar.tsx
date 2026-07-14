"use client";

import { FileScan, LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";
import { navGroups } from "./nav-items";

type Props = {
  workspace: string;
  workspaceName: string;
  user: { name: string; email: string };
};

export function Topbar({ workspace, workspaceName, user }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // derive the current section label from the nav so the topbar shows context.
  const current = navGroups(workspace)
    .flatMap((g) => g.items)
    .filter((i) =>
      i.href === `/app/${workspace}` ? pathname === i.href : pathname.startsWith(i.href),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-4">
      {/* trigger is mobile-only: on desktop the sidebar is fixed and always open,
          so there is no collapse affordance. */}
      <SidebarTrigger className="-ml-1 size-7 text-muted-foreground md:hidden" />
      <nav className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="truncate text-muted-foreground">{workspaceName}</span>
        {current && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <span className="truncate font-medium text-foreground">{current.label}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" className="h-8">
          <Link href={`/app/${workspace}/check`}>
            <FileScan className="size-3.5" />
            New check
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Account menu"
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-muted font-mono text-[11px] text-muted-foreground">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <User className="size-4" />
                Account settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
