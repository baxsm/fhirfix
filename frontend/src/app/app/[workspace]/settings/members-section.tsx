"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-8">
      {canManage && (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email) return;
            invite.mutate({ workspaceId, email, role: inviteRole });
          }}
          noValidate
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="invite-email">Invite by email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as WorkspaceRole)}>
              <SelectTrigger id="invite-role" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.filter((r) => r !== "owner").map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={invite.isPending || !email}>
            {invite.isPending ? "Sending..." : "Send invite"}
          </Button>
        </form>
      )}

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-medium">Members</h3>
        </div>
        {membersQuery.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
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
            {membersQuery.data.members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.user.name}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                {canManage && m.role !== "owner" ? (
                  <Select
                    value={m.role}
                    onValueChange={(v) =>
                      updateRole.mutate({
                        workspaceId,
                        memberId: m.id,
                        role: v as WorkspaceRole,
                      })
                    }
                  >
                    <SelectTrigger className="w-32" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="secondary" className="font-mono">
                    {m.role}
                  </Badge>
                )}
                {canManage && m.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate({ workspaceId, memberId: m.id })}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
