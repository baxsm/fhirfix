"use client";

import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { activeNavItem, navGroups } from "./nav-items";

export function MobileNav({ workspace, role }: { workspace: string; role: WorkspaceRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const activeHref = activeNavItem(workspace, pathname)?.href;

  // must close before navigating or radix's exit animation leaves the overlay mounted
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open navigation">
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      {/* must disable the exit animation or radix leaves an invisible overlay mounted */}
      <SheetContent side="left" className="w-64 p-0 data-[state=closed]:animate-none">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <nav className="flex h-full flex-col overflow-y-auto px-2.5 pt-12 pb-4">
          {navGroups(workspace).map((group, gi) => {
            const items = group.items.filter(
              (item) => !item.requires || can(role, item.requires.resource, item.requires.action),
            );
            if (items.length === 0) return null;
            return (
              <div key={group.label} className={gi === 0 ? "" : "mt-5"}>
                <p className="px-2 pb-1.5 text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground/70 uppercase">
                  {group.label}
                </p>
                <ul className="flex flex-col gap-1">
                  {items.map((item) => {
                    const active = activeHref === item.href;
                    return (
                      <li key={item.href}>
                        <button
                          type="button"
                          onClick={() => go(item.href)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left text-[13px]",
                            active
                              ? "bg-primary-subtle font-medium text-primary-subtle-foreground"
                              : "text-sidebar-foreground",
                          )}
                        >
                          <item.icon
                            className={cn("size-4 shrink-0", !active && "text-muted-foreground")}
                          />
                          <span className="truncate">{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
