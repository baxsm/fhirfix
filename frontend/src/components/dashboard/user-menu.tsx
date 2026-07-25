"use client";

import { ChevronDown, LifeBuoy, LogOut, User } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceRole } from "@/lib/permissions";

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  billing: "Billing",
  auditor: "Auditor",
};

/**
 * the account control.
 *
 * it used to be a bare 28px filled circle sitting next to the filled primary
 * CTA - two competing filled shapes at different sizes, which is why it read as
 * a broken second button. the fix is to change its CATEGORY, not its colour: a
 * ghost pill with a name and a chevron reads as a menu control, so the primary
 * button stays the only filled thing in the bar.
 *
 * polaris models this exactly: its TopBar.UserMenu trigger takes `name` and a
 * `detail` line (reserved for org context), and its `actions` prop is an array
 * of GROUPS with an icon per row - grouping and icons are part of the spec, not
 * decoration. role goes in the detail slot because in a compliance product what
 * you are allowed to do is part of who you are.
 */
export function UserMenu({
  user,
  role,
  onSignOut,
}: {
  user: { name: string; email: string };
  role: WorkspaceRole;
  onSignOut: () => void;
}) {
  const initials = user.name.slice(0, 2).toUpperCase() || "??";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="press flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 pl-1 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted"
        >
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-foreground font-mono text-[11px] text-background">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* the name is hidden on small screens, where the avatar alone is the
              established compact form. */}
          <span className="hidden min-w-0 max-w-[140px] flex-col gap-0.5 leading-none sm:flex">
            <span className="truncate text-xs font-medium">{user.name}</span>
            <span className="truncate text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</span>
          </span>
          <ChevronDown className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-0">
        {/* identity as a real header block on its own surface, not a text line.
            this is what stops the menu reading as bare. */}
        <div className="flex items-center gap-3 border-b bg-muted px-3 py-3">
          <Avatar className="size-9 shrink-0">
            <AvatarFallback className="bg-foreground font-mono text-xs text-background">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium leading-none">{user.name}</p>
            <p className="truncate font-mono text-[11px] leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="pt-0.5 text-[11px] leading-none text-muted-foreground">
              {ROLE_LABEL[role]} in this workspace
            </p>
          </div>
        </div>

        {/* h-9 rows: 28px was too tight for a row carrying an icon and a hint. */}
        <div className="p-1.5">
          <DropdownMenuItem asChild className="h-9 gap-2.5 px-2">
            <Link href="/account">
              <User className="size-4 text-muted-foreground" />
              Account
              <span className="ml-auto text-[11px] text-muted-foreground">Name, password</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="h-9 gap-2.5 px-2">
            <Link href="/docs">
              <LifeBuoy className="size-4 text-muted-foreground" />
              Docs and API
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1.5">
          <DropdownMenuItem onClick={onSignOut} className="h-9 gap-2.5 px-2">
            <LogOut className="size-4 text-muted-foreground" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
