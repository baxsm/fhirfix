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
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { breadcrumbs } from "./nav-items";
import { contentInset } from "./page-container";

type Props = {
  workspace: string;
  workspaceName: string;
  user: { name: string; email: string };
};

export function Topbar({ workspace, workspaceName, user }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const trail = breadcrumbs(workspace, workspaceName, pathname);

  async function handleSignOut() {
    await signOut();
    router.push("/sign-in");
  }

  return (
    // sits INSIDE the content column, not spanning the window, so the floating
    // rail keeps its gutter. sticky so the breadcrumb and account menu survive a
    // long scroll down the report.
    // h-14 so a 32px control has 12px above and below instead of 6. the inset is
    // shared with main - see contentInset.
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-canvas/85 backdrop-blur-md",
        contentInset,
      )}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        {trail.map((crumb, i) => {
          const isLast = i === trail.length - 1;
          // ids are long and must not push the rest of the topbar off-screen,
          // so only the final crumb is allowed to truncate.
          return (
            <span key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && <span className="shrink-0 text-muted-foreground/40">/</span>}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "truncate",
                    isLast ? "font-medium text-foreground" : "shrink-0 text-muted-foreground",
                    // run ids and other record keys are mono everywhere else in
                    // the app; the crumb should match.
                    isLast && /^[a-z]+_[a-z0-9]{6,}$/i.test(crumb.label) && "font-mono text-xs",
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </span>
          );
        })}
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
