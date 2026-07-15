"use client";

import { useQuery } from "@tanstack/react-query";
import { KeyRound, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import { CreateKeyDialog } from "./create-key-dialog";
import { RevokeKeyDialog } from "./revoke-key-dialog";
import { FreshnessDot, fmtDate, timeAgo } from "./shared";

type KeyMode = "test" | "live";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  mode: KeyMode;
  scopes: string[];
  createdAt: string | Date;
  lastUsedAt: string | Date | null;
  revokedAt: string | Date | null;
}

export function ApiKeysSection({
  workspaceId,
  canManage,
}: {
  workspaceId: string;
  canManage: boolean;
}) {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.developers.apiKeys.list.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  if (query.isPending) return <Skeleton className="h-32 w-full" />;
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-sm text-muted-foreground">Could not load API keys.</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const keys = query.data as ApiKey[];

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus />
            Create key
          </Button>
        </div>
      )}

      {keys.length === 0 ? (
        <EmptyKeys canManage={canManage} onCreate={() => setCreateOpen(true)} />
      ) : (
        <KeysTable keys={keys} canManage={canManage} onRevoke={(k) => setRevokeTarget(k)} />
      )}

      <CreateKeyDialog
        workspaceId={workspaceId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => query.refetch()}
      />
      <RevokeKeyDialog
        workspaceId={workspaceId}
        target={revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        onRevoked={() => query.refetch()}
      />
    </div>
  );
}

function KeysTable({
  keys,
  canManage,
  onRevoke,
}: {
  keys: ApiKey[];
  canManage: boolean;
  onRevoke: (k: ApiKey) => void;
}) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-5 py-2 font-medium">Name</th>
            <th className="px-5 py-2 font-medium">Key</th>
            <th className="px-5 py-2 font-medium">Scopes</th>
            <th className="px-5 py-2 font-medium">Last used</th>
            <th className="px-5 py-2 font-medium">Created</th>
            <th className="w-8 px-5 py-2" />
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const revoked = !!k.revokedAt;
            return (
              <tr key={k.id} className="border-b last:border-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={revoked ? "text-muted-foreground line-through" : "font-medium"}
                    >
                      {k.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        k.mode === "live"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-muted bg-muted/40 text-muted-foreground"
                      }
                    >
                      {k.mode}
                    </Badge>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <code className="font-mono text-xs text-muted-foreground">
                    {k.prefix}
                    <span className="text-muted-foreground/50">••••••••</span>
                  </code>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  {revoked ? (
                    <span className="text-xs text-muted-foreground">Revoked</span>
                  ) : (
                    <span
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      title={k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Never used"}
                    >
                      <FreshnessDot lastUsedAt={k.lastUsedAt} />
                      {timeAgo(k.lastUsedAt)}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">{fmtDate(k.createdAt)}</td>
                <td className="px-5 py-3 text-right">
                  {canManage && !revoked && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Key actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem variant="destructive" onSelect={() => onRevoke(k)}>
                          Revoke key
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyKeys({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <KeyRound className="size-7 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium">No API keys yet</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Create a key to call the FHIRfix REST API from your code, CI, or the SDKs.
        </p>
      </div>
      {canManage && (
        <Button size="sm" onClick={onCreate}>
          <Plus />
          Create your first key
        </Button>
      )}
    </div>
  );
}
