"use client";

import { BookOpen, CreditCard, LogOut, Settings, UserRound, Users } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";

/**
 * the account control.
 *
 * built against shadcn's own `nav-user` block, which is the reference
 * implementation for this component. three things there that this got wrong
 * before:
 *
 * 1. the panel avatar is the SAME size as the trigger (h-8), not enlarged.
 *    ours is a generated placeholder the user cannot replace, so showing it
 *    bigger tells them nothing they did not already see.
 * 2. the header is `px-1 py-1.5` inside the panel's own p-1 - not a 14px inset
 *    on a tinted surface. it is a label, not a hero.
 * 3. no role badge. checked across github, vercel, linear, figma, slack,
 *    notion, asana, stripe, sentry, intercom and jira: none of them put role in
 *    the personal account menu. role belongs to you-in-a-workspace, but this
 *    menu is you-as-a-person and follows you across workspaces. it lives on the
 *    members page instead, which is where every one of those products puts it.
 */
export function UserMenu({
  user,
  workspace,
  onSignOut,
}: {
  user: { name: string; email: string };
  workspace: string;
  onSignOut: () => void;
}) {
  const base = `/app/${workspace}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="press cursor-pointer rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:ring-2 data-[state=open]:ring-border"
        >
          <UserAvatar name={user.name} email={user.email} size={32} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5">
            <UserAvatar name={user.name} email={user.email} size={32} />
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/account">
              <UserRound />
              Account
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}/settings`}>
              <Settings />
              Workspace settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`${base}/settings`}>
              <Users />
              Members
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`${base}/billing`}>
              <CreditCard />
              Billing
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/docs">
              <BookOpen />
              Docs and API
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
