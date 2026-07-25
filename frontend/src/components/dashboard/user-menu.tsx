"use client";

import { BookOpen, CreditCard, LogOut, Settings, UserRound, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

type Row = {
  label: string;
  href: string;
  icon: typeof UserRound;
};

/**
 * the account control.
 *
 * the TRIGGER is a bare circle on purpose: the topbar should not carry the
 * user's name and role permanently, that is noise on every screen. identity
 * belongs in the panel, which is where someone looks when they want it.
 *
 * the PANEL carries the identity: photo, name, email and role, then the rows
 * grouped by purpose with an icon on each. grouping and icons are what make it
 * read as an account panel rather than a list of links.
 */
export function UserMenu({
  user,
  role,
  workspace,
  onSignOut,
}: {
  user: { name: string; email: string };
  role: WorkspaceRole;
  workspace: string;
  onSignOut: () => void;
}) {
  const initials = user.name.slice(0, 2).toUpperCase() || "??";
  const base = `/app/${workspace}`;

  const groups: Row[][] = [
    [
      { label: "Account", href: "/account", icon: UserRound },
      { label: "Workspace settings", href: `${base}/settings`, icon: Settings },
    ],
    [
      { label: "Members", href: `${base}/settings`, icon: Users },
      { label: "Billing", href: `${base}/billing`, icon: CreditCard },
      { label: "Credits and usage", href: `${base}/billing`, icon: Wallet },
    ],
    [{ label: "Docs and API", href: "/docs", icon: BookOpen }],
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="press cursor-pointer rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:ring-2 data-[state=open]:ring-border"
        >
          <Avatar className="size-8">
            <AvatarImage src="/avatar-placeholder.svg" alt="" />
            <AvatarFallback className="bg-muted font-mono text-[11px] text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[268px] p-0">
        {/* identity header: photo, name, email, and the role badge. this is the
            block that makes the panel feel like an account, not a link list. */}
        <div className="flex items-center gap-3 px-3.5 py-3.5">
          <Avatar className="size-11 shrink-0">
            <AvatarImage src="/avatar-placeholder.svg" alt="" />
            <AvatarFallback className="bg-muted font-mono text-xs text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold leading-none">{user.name}</p>
            <p className="truncate font-mono text-[11px] leading-none text-muted-foreground">
              {user.email}
            </p>
            <span className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground">
              {ROLE_LABEL[role]}
            </span>
          </div>
        </div>

        {groups.map((rows, i) => (
          <div key={rows[0]?.label ?? i}>
            <DropdownMenuSeparator className="my-0" />
            <div className="p-1.5">
              {rows.map((row) => (
                <DropdownMenuItem key={row.label} asChild className="h-9 gap-2.5 px-2.5">
                  <Link href={row.href}>
                    <row.icon className="size-4 text-muted-foreground" />
                    {row.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          </div>
        ))}

        <DropdownMenuSeparator className="my-0" />
        <div className="p-1.5">
          <DropdownMenuItem onClick={onSignOut} className="h-9 gap-2.5 px-2.5">
            <LogOut className="size-4 text-muted-foreground" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
