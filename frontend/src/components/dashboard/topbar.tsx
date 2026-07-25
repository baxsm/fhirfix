"use client";

import { FileScan } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import type { WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { breadcrumbs } from "./nav-items";
import { contentInset } from "./page-container";
import { UserMenu } from "./user-menu";

type Props = {
  workspace: string;
  workspaceName: string;
  user: { name: string; email: string };
  role: WorkspaceRole;
};

export function Topbar({ workspace, workspaceName, user, role }: Props) {
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

        <UserMenu user={user} role={role} onSignOut={handleSignOut} />
      </div>
    </header>
  );
}
