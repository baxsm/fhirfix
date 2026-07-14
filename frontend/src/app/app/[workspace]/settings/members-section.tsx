"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { useTRPC } from "@/trpc/client";

const ROLES: WorkspaceRole[] = ["owner", "admin", "member", "billing", "auditor"];

// role -> accent. owner/admin carry weight; auditor is muted (read-only).
const roleTone: Record<WorkspaceRole, string> = {
  owner: "text-primary",
  admin: "text-foreground",
  member: "text-foreground",
  billing: "text-foreground",
  auditor: "text-muted-foreground",
};

export function MembersSection({
  workspaceId,
  role,
}: {
  workspaceId: string;
  role: WorkspaceRole;
}) {
  const trpc = useTRPC();
  const canManage = can(role, "workspaceSettings", "update");

  const membersQuery = useQuery(trpc.member.list.queryOptions({ workspaceId }));

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");

  const invite = useMutation(
    trpc.member.invite.mutationOptions({
      onSuccess: () => {
        toast.success(`Invitation sent to ${email}`);
        setEmail("");
        membersQuery.refetch();
      },
      onError: (e) => toast.error(e.message ?? "Could not send the invite."),
    }),
  );

  const updateRole = useMutation(
    trpc.member.updateRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role updated");
        membersQuery.refetch();
      },
      onError: (e) => toast.error(e.message ?? "Could not update the role."),
    }),
  );

  const remove = useMutation(
    trpc.member.remove.mutationOptions({
      onSuccess: () => {
        toast.success("Member removed");
        membersQuery.refetch();
      },
      onError: (e) => toast.error(e.message ?? "Could not remove the member."),
    }),
  );

  return (
    <div className="space-y-6">
      {canManage && (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email) return;
            invite.mutate({ workspaceId, email, role: inviteRole });
          }}
          noValidate
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs text-muted-foreground">
              Invite by email
            </Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 font-mono text-sm"
            />
          </div>
          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
            <SelectTrigger className="h-9 w-32 font-mono text-xs" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.filter((r) => r !== "owner").map((r) => (
                <SelectItem key={r} value={r} className="font-mono text-xs">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" className="h-9" disabled={invite.isPending || !email}>
            {invite.isPending ? "Sending" : "Invite"}
          </Button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-2.5">
          <span className="text-xs font-medium text-muted-foreground">
            {membersQuery.data
              ? `${membersQuery.data.total} member${membersQuery.data.total === 1 ? "" : "s"}`
              : "Members"}
          </span>
        </div>

        {membersQuery.isPending ? (
          <div className="divide-y">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-7 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-48" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : membersQuery.isError ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-sm text-muted-foreground">Could not load members.</p>
            <Button variant="outline" size="sm" onClick={() => membersQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {membersQuery.data.members.map((m) => {
              const r = m.role as WorkspaceRole;
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] font-medium text-muted-foreground">
                    {m.user.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{m.user.name}</p>
                    <p className="truncate font-mono text-xs leading-tight text-muted-foreground">
                      {m.user.email}
                    </p>
                  </div>

                  {/* fixed-width role column keeps the badge/select aligned across rows */}
                  <div className="flex w-32 shrink-0 justify-end">
                    {canManage && r !== "owner" ? (
                      <Select
                        value={r}
                        onValueChange={(v) =>
                          updateRole.mutate({
                            workspaceId,
                            memberId: m.id,
                            role: v as WorkspaceRole,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-full font-mono text-xs" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role} className="font-mono text-xs">
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-flex h-8 items-center rounded-md border px-2.5 font-mono text-xs ${roleTone[r]}`}
                      >
                        {r}
                      </span>
                    )}
                  </div>

                  {/* fixed-width action column, always present so rows line up */}
                  <div className="flex w-16 shrink-0 justify-end">
                    {canManage && r !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => remove.mutate({ workspaceId, memberId: m.id })}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
