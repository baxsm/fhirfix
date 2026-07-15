"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTRPC } from "@/trpc/client";

interface EndpointTarget {
  id: string;
  url: string;
}

export function DeleteWebhookDialog({
  workspaceId,
  target,
  onOpenChange,
  onDeleted,
}: {
  workspaceId: string;
  target: EndpointTarget | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const trpc = useTRPC();
  const del = useMutation(
    trpc.developers.webhooks.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Endpoint deleted");
        onDeleted();
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message ?? "Could not delete the endpoint."),
    }),
  );

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this endpoint?</DialogTitle>
          <DialogDescription>
            <code className="font-mono text-xs">{target?.url}</code> stops receiving events right
            away. To pause instead of delete, use Pause endpoint. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={del.isPending}
            onClick={() => {
              if (target) del.mutate({ workspaceId, id: target.id });
            }}
          >
            {del.isPending ? "Deleting..." : "Delete endpoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
