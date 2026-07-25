"use client";

import { BookOpen, CreditCard, LogOut, Settings, UserRound, Users } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/ui/user-avatar";

type Row = { label: string; href: string; icon: typeof UserRound };

/**
 * the account control.
 *
 * three structural rules, each one checked rather than assumed:
 *
 * 1. the panel does NOT repeat the avatar. ours is a generic icon the user
 *    cannot replace, so showing it again - at any size - tells them nothing
 *    they did not just click on.
 * 2. no role badge. checked github, vercel, linear, figma, slack, notion,
 *    asana, stripe, sentry, intercom, jira: none put role in the personal
 *    account menu. role is you-in-a-workspace; this menu is you-as-a-person and
 *    follows you across workspaces. it lives on the members page.
 * 3. greyscale only. globals.css: "chrome carries NO hue, every saturated pixel
 *    belongs to a finding", and violet is wordmark-only.
 *
 * the styling is ours: a flush identity block on its own surface, hairline
 * dividers that run the full panel width, and 34px rows with a settled icon
 * column - not the stock menu.
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

  const groups: Row[][] = [
    [
      { label: "Account", href: "/account", icon: UserRound },
      { label: "Workspace settings", href: `${base}/settings`, icon: Settings },
      { label: "Members", href: `${base}/settings`, icon: Users },
    ],
    [
      { label: "Billing", href: `${base}/billing`, icon: CreditCard },
      { label: "Docs and API", href: "/docs", icon: BookOpen },
    ],
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="press cursor-pointer rounded-full outline-none ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=open]:ring-2 data-[state=open]:ring-foreground/20"
        >
          <UserAvatar name={user.name} size={32} />
        </button>
      </DropdownMenuTrigger>

      {/* p-0 so the dividers can run edge to edge. the stock panel pads itself,
          which leaves every rule floating with a gap at both ends.
          the ring strength now lives on the primitive - a white panel on a
          96.3-light canvas had almost no edge at the old 10%. */}
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[248px] overflow-hidden p-0 shadow-lg"
      >
        {/* NOT a tint. muted/50 resolves to ~L96.2 and the canvas is L96.3, so
            a tinted header made the panel edge vanish against the page. the
            identity block is separated by weight and the rule below it. */}
        <div className="px-3 py-2.5">
          <p className="truncate text-[13px] font-semibold leading-tight">{user.name}</p>
          <p className="truncate pt-0.5 font-mono text-[11px] leading-tight text-muted-foreground">
            {user.email}
          </p>
        </div>

        {groups.map((rows) => (
          <div key={rows[0]?.label} className="border-t p-1">
            {rows.map((row) => (
              <DropdownMenuItem
                key={row.label}
                asChild
                className="h-[34px] gap-2.5 rounded-md px-2 text-[13px]"
              >
                <Link href={row.href}>
                  <row.icon className="size-4 text-muted-foreground/70" />
                  {row.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        ))}

        <div className="border-t p-1">
          <DropdownMenuItem
            onClick={onSignOut}
            className="h-[34px] gap-2.5 rounded-md px-2 text-[13px]"
          >
            <LogOut className="size-4 text-muted-foreground/70" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
