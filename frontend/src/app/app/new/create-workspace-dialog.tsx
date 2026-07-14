"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateWorkspaceForm } from "./create-workspace-form";

// the create-workspace modal for users who already have a workspace. triggered
// from the workspace switcher (and anywhere else that needs it). the first-run
// case gets the full onboarding page instead; this is the quick path.
export function CreateWorkspaceDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md border bg-card text-interactive">
              <Plus className="size-4" />
            </span>
            <DialogTitle>New workspace</DialogTitle>
          </div>
          <DialogDescription>
            A separate space for another team, environment, or source system. Its runs, mappings,
            and keys are isolated.
          </DialogDescription>
        </DialogHeader>
        <CreateWorkspaceForm layout="modal" onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
