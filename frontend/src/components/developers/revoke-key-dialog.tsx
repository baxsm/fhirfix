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

interface KeyTarget {
  id: string;
  name: string;
  prefix: string;
}

export function RevokeKeyDialog({
  workspaceId,
  target,
  onOpenChange,
  onRevoked,
}: {
  workspaceId: string;
  target: KeyTarget | null;
  onOpenChange: (open: boolean) => void;
  onRevoked: () => void;
}) {
  const trpc = useTRPC();
  const revoke = useMutation(
    trpc.developers.apiKeys.revoke.mutationOptions({
      onSuccess: () => {
        toast.success("Key revoked");
        onRevoked();
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message ?? "Could not revoke the key."),
    }),
  );

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke this key?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{target?.name}</span> (
            <code className="font-mono text-xs">{target?.prefix}…</code>) stops working immediately.
            Any request using it will get a 401. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={revoke.isPending}
            onClick={() => {
              if (target) revoke.mutate({ workspaceId, keyId: target.id });
            }}
          >
            {revoke.isPending ? "Revoking..." : "Revoke key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
