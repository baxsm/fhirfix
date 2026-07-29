"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { InlineNote } from "@/components/ui/inline-note";
import { useTRPC } from "@/trpc/client";
import { SecretReveal } from "./secret-reveal";

interface EndpointTarget {
  id: string;
  url: string;
}

export function RotateSecretDialog({
  workspaceId,
  target,
  onOpenChange,
}: {
  workspaceId: string;
  target: EndpointTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const [newSecret, setNewSecret] = useState<string | null>(null);

  // clear the revealed secret whenever the dialog target changes.
  useEffect(() => {
    if (!target) setNewSecret(null);
  }, [target]);

  const rotate = useMutation(
    trpc.developers.webhooks.rotateSecret.mutationOptions({
      onSuccess: (res) => setNewSecret(res.secret),
      onError: (e) => toast.error(e.message ?? "Could not rotate the secret."),
    }),
  );

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {newSecret ? (
          <>
            <DialogHeader>
              <DialogTitle>New signing secret</DialogTitle>
              <DialogDescription>
                The old secret is dead. Update your receiver with this one. It is shown once.
              </DialogDescription>
            </DialogHeader>
            <SecretReveal value={newSecret} label="New signing secret" />
            <DialogFooter>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rotate signing secret?</DialogTitle>
              <DialogDescription>
                The current secret for <code className="font-mono text-xs">{target?.url}</code>{" "}
                stops working immediately. Deliveries will fail signature checks until you update
                your receiver with the new secret.
              </DialogDescription>
            </DialogHeader>
            <InlineNote flush>
              Rotate only when you are ready to swap the secret on your side.
            </InlineNote>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={rotate.isPending}
                onClick={() => {
                  if (target) rotate.mutate({ workspaceId, id: target.id });
                }}
              >
                {rotate.isPending ? "Rotating..." : "Rotate secret"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
