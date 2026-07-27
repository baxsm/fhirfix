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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLastPresent } from "@/lib/use-last-present";
import { useTRPC } from "@/trpc/client";
import type { MappingRow } from "./types";

export function EditMappingDialog({
  workspaceId,
  target,
  onOpenChange,
  onSaved,
}: {
  workspaceId: string;
  target: MappingRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [targetValue, setTargetValue] = useState("");

  const shown = useLastPresent(target);

  // seed the field whenever a new row opens it rather than on mount.
  useEffect(() => {
    if (target) setTargetValue(target.targetValue);
  }, [target]);

  const update = useMutation(
    trpc.mappings.update.mutationOptions({
      onSuccess: (res) => {
        toast.success(`Saved as v${res.version}. The previous version is kept in history.`);
        onOpenChange(false);
        onSaved();
      },
      onError: (e) => toast.error(e.message ?? "Could not save the mapping."),
    }),
  );

  const unchanged = targetValue.trim() === target?.targetValue;
  const incomplete = !targetValue.trim() || unchanged;

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit mapping</DialogTitle>
          <DialogDescription>
            Saving creates v{(shown?.version ?? 1) + 1}. The current version stays in history, so
            past reports still explain what they did.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!target || incomplete || update.isPending) return;
            update.mutate({
              workspaceId,
              mappingId: target.id,
              targetValue: targetValue.trim(),
              targetSystem: target.targetSystem,
            });
          }}
        >
          <div className="space-y-2">
            <Label>Source value</Label>
            <p className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              {shown?.sourceValue}
            </p>
            <p className="text-xs text-muted-foreground">
              The source value cannot change. Add a separate mapping for a different one.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-target">Target value</Label>
            <Input
              id="edit-target"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={incomplete || update.isPending}>
              {update.isPending ? "Saving..." : "Save new version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
