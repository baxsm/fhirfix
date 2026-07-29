"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Plus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { CreateWebhookDialog } from "./create-webhook-dialog";
import { DeleteWebhookDialog } from "./delete-webhook-dialog";
import { RotateSecretDialog } from "./rotate-secret-dialog";
import { timeAgo } from "./shared";

interface Endpoint {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  lastDeliveryStatus: string | null;
  lastDeliveryAt: string | Date | null;
  createdAt: string | Date;
}

export function isDeliveryOk(status: string | null): boolean {
  return !!status && status.toLowerCase().endsWith("ok");
}

export function WebhooksSection({
  workspaceId,
  canManage,
}: {
  workspaceId: string;
  canManage: boolean;
}) {
  const trpc = useTRPC();
  const query = useQuery({
    ...trpc.developers.webhooks.list.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [rotateTarget, setRotateTarget] = useState<Endpoint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Endpoint | null>(null);

  const setEnabled = useMutation(
    trpc.developers.webhooks.setEnabled.mutationOptions({
      onSuccess: () => query.refetch(),
      onError: (e) => toast.error(e.message ?? "Could not update the endpoint."),
    }),
  );

  const testPing = useMutation(
    trpc.developers.webhooks.testPing.mutationOptions({
      onSuccess: (res) =>
        res.delivered === 0
          ? toast.error("No endpoint is subscribed to that event, so nothing was sent.")
          : toast.success(`Sent a ${res.event} test event to ${res.delivered} endpoint(s).`),
      onError: (e) => toast.error(e.message ?? "Could not send the test event."),
    }),
  );

  if (query.isPending) return <Skeleton className="h-28 w-full" />;
  if (query.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-sm text-muted-foreground">Could not load webhooks.</p>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const endpoints = query.data as Endpoint[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {endpoints.length === 0
            ? "No endpoints yet"
            : `${endpoints.filter((e) => e.enabled).length} enabled · ${endpoints.filter((e) => !e.enabled).length} paused`}
        </span>
        {canManage && (
          <div className="flex items-center gap-2">
            {endpoints.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={testPing.isPending}
                onClick={() => testPing.mutate({ workspaceId })}
              >
                <Send />
                {testPing.isPending ? "Sending..." : "Send test event"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus />
              Add endpoint
            </Button>
          </div>
        )}
      </div>

      {endpoints.length > 0 && (
        <div className="divide-y rounded-md border">
          {endpoints.map((ep) => (
            <EndpointRow
              key={ep.id}
              endpoint={ep}
              canManage={canManage}
              onToggle={(enabled) => setEnabled.mutate({ workspaceId, id: ep.id, enabled })}
              onRotate={() => setRotateTarget(ep)}
              onDelete={() => setDeleteTarget(ep)}
            />
          ))}
        </div>
      )}

      <CreateWebhookDialog
        workspaceId={workspaceId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => query.refetch()}
      />
      <RotateSecretDialog
        workspaceId={workspaceId}
        target={rotateTarget}
        onOpenChange={(open) => !open && setRotateTarget(null)}
      />
      <DeleteWebhookDialog
        workspaceId={workspaceId}
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => query.refetch()}
      />
    </div>
  );
}

function EndpointRow({
  endpoint,
  canManage,
  onToggle,
  onRotate,
  onDelete,
}: {
  endpoint: Endpoint;
  canManage: boolean;
  onToggle: (enabled: boolean) => void;
  onRotate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3.5">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <StatusIndicator enabled={endpoint.enabled} delivery={endpoint.lastDeliveryStatus} />
          <code className="truncate font-mono text-xs">{endpoint.url}</code>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {endpoint.events.map((ev) => (
            <span
              key={ev}
              className="rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[0.75rem] text-muted-foreground"
            >
              {ev}
            </span>
          ))}
        </div>
        <p className="text-[0.6875rem] text-muted-foreground">
          {endpoint.lastDeliveryAt ? (
            <>
              Last delivery{" "}
              <span
                className={
                  isDeliveryOk(endpoint.lastDeliveryStatus) ? "text-success" : "text-destructive"
                }
              >
                {endpoint.lastDeliveryStatus ?? "unknown"}
              </span>{" "}
              {timeAgo(endpoint.lastDeliveryAt)}
            </>
          ) : (
            "No deliveries yet"
          )}
        </p>
      </div>

      {canManage && (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[0.6875rem] text-muted-foreground">
            {endpoint.enabled ? "Enabled" : "Paused"}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Endpoint actions">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onToggle(!endpoint.enabled)}>
                {endpoint.enabled ? "Pause endpoint" : "Enable endpoint"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onRotate}>Rotate signing secret</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                Delete endpoint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

function StatusIndicator({ enabled, delivery }: { enabled: boolean; delivery: string | null }) {
  const tone =
    !enabled || delivery == null
      ? "bg-muted-foreground/40"
      : isDeliveryOk(delivery)
        ? "bg-muted-foreground/40"
        : "bg-destructive";
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", tone)} />;
}
