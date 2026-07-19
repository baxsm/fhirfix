"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import type { MappingType } from "./types";

const TYPE_OPTIONS: { value: MappingType; label: string; hint: string }[] = [
  {
    value: "authority_to_system",
    label: "Assigning authority",
    hint: "An HL7v2 assigning authority to the FHIR identifier system URI it means.",
  },
  {
    value: "code_to_code",
    label: "Code to code",
    hint: "A local code to the conformant code, like M to male.",
  },
  {
    value: "facility_to_org",
    label: "Facility to organization",
    hint: "A facility identifier to the Organization it belongs to.",
  },
  { value: "custom", label: "Custom", hint: "Anything the other three do not cover." },
];

export function CreateMappingDialog({
  workspaceId,
  open,
  onOpenChange,
  onCreated,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const trpc = useTRPC();
  const [type, setType] = useState<MappingType>("authority_to_system");
  const [sourceValue, setSourceValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [scoped, setScoped] = useState(false);
  const [sourceSystem, setSourceSystem] = useState("");

  const reset = () => {
    setType("authority_to_system");
    setSourceValue("");
    setTargetValue("");
    setScoped(false);
    setSourceSystem("");
  };

  const create = useMutation(
    trpc.mappings.create.mutationOptions({
      onSuccess: () => {
        toast.success("Mapping added. Future runs will apply it.");
        // close first, then refetch. the order is not load-bearing, it just
        // keeps the dismiss from waiting on a network round trip.
        reset();
        onOpenChange(false);
        onCreated();
      },
      onError: (e) => toast.error(e.message ?? "Could not add the mapping."),
    }),
  );

  const hint = TYPE_OPTIONS.find((t) => t.value === type)?.hint ?? "";
  const incomplete = !sourceValue.trim() || !targetValue.trim() || (scoped && !sourceSystem.trim());

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a mapping</DialogTitle>
          <DialogDescription>
            Every run in this workspace will apply it from now on. Editing it later keeps the old
            version in history.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (incomplete || create.isPending) return;
            create.mutate({
              workspaceId,
              type,
              sourceValue: sourceValue.trim(),
              targetValue: targetValue.trim(),
              targetSystem: null,
              scope: scoped ? "source_system" : "workspace",
              sourceSystem: scoped ? sourceSystem.trim() : null,
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="mapping-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as MappingType)}>
              <SelectTrigger id="mapping-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mapping-source">Source value</Label>
              <Input
                id="mapping-source"
                value={sourceValue}
                onChange={(e) => setSourceValue(e.target.value)}
                placeholder="SIMULATOR-MRN"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapping-target">Target value</Label>
              <Input
                id="mapping-target"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="http://hospital.example/fhir/sid/mrn"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={scoped}
                onChange={(e) => setScoped(e.target.checked)}
                className="size-3.5 rounded border-input accent-[var(--interactive)]"
              />
              Only apply to one source system
            </label>
            {scoped && (
              <Input
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value)}
                placeholder="epic-adt-feed"
                aria-label="Source system"
                className="font-mono text-xs"
              />
            )}
            <p className="text-xs text-muted-foreground">
              {scoped
                ? "Runs from other feeds will not see this mapping."
                : "Applies to every run in the workspace."}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={incomplete || create.isPending}>
              {create.isPending ? "Adding..." : "Add mapping"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
