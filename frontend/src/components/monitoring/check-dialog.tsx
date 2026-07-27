"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";
import { type ChannelType, CRON_PRESETS, type ScheduledCheckRow, type TargetType } from "./types";

const TARGET_OPTIONS: { value: TargetType; label: string; hint: string; placeholder: string }[] = [
  {
    value: "endpoint",
    label: "FHIR endpoint",
    hint: "A live FHIR URL. We GET it on the schedule and validate whatever it returns.",
    placeholder: "https://api.example.org/fhir/Patient/123",
  },
  {
    value: "source_url",
    label: "Source URL",
    hint: "Any URL serving a resource, bundle or HL7v2 message.",
    placeholder: "https://files.example.org/nightly-export.json",
  },
  {
    value: "upload_folder",
    label: "Latest upload",
    hint: "Re-checks the most recent file uploaded to this workspace.",
    placeholder: "uploads/",
  },
];

const CUSTOM = "__custom__";

interface Draft {
  name: string;
  scheduleCron: string;
  targetType: TargetType;
  targetRef: string;
  minPassRate: string;
  maxErrorDelta: string;
  channels: { type: ChannelType; target: string }[];
  enabled: boolean;
}

const emptyDraft: Draft = {
  name: "",
  scheduleCron: "0 3 * * *",
  targetType: "endpoint",
  targetRef: "",
  minPassRate: "",
  maxErrorDelta: "",
  channels: [],
  enabled: true,
};

function draftFrom(check: ScheduledCheckRow): Draft {
  return {
    name: check.name,
    scheduleCron: check.scheduleCron,
    targetType: check.targetType,
    targetRef: check.targetRef,
    minPassRate: check.baselineConfig?.minPassRate?.toString() ?? "",
    maxErrorDelta: check.baselineConfig?.maxErrorDelta?.toString() ?? "",
    channels: [],
    enabled: check.enabled,
  };
}

export function CheckDialog({
  workspaceId,
  open,
  target,
  onOpenChange,
  onSaved,
}: {
  workspaceId: string;
  open: boolean;
  target: ScheduledCheckRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const editing = target !== null;
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  useEffect(() => {
    if (!open) return;
    setDraft(target ? draftFrom(target) : emptyDraft);
  }, [open, target]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const done = (message: string) => {
    toast.success(message);
    onOpenChange(false);
    onSaved();
  };

  const create = useMutation(
    trpc.monitoring.createCheck.mutationOptions({
      onSuccess: () => done("Scheduled check created."),
      onError: (e) => toast.error(e.message ?? "Could not create the check."),
    }),
  );
  const update = useMutation(
    trpc.monitoring.updateCheck.mutationOptions({
      onSuccess: () => done("Scheduled check saved."),
      onError: (e) => toast.error(e.message ?? "Could not save the check."),
    }),
  );

  const busy = create.isPending || update.isPending;
  const targetOption = TARGET_OPTIONS.find(
    (t) => t.value === draft.targetType,
  ) as (typeof TARGET_OPTIONS)[number];
  const incomplete =
    !draft.name.trim() ||
    !draft.scheduleCron.trim() ||
    !draft.targetRef.trim() ||
    draft.channels.some((c) => !c.target.trim());

  const usingPreset = CRON_PRESETS.some((p) => p.value === draft.scheduleCron);

  const submit = () => {
    if (incomplete || busy) return;
    const minPassRate = draft.minPassRate.trim() ? Number(draft.minPassRate) : undefined;
    const maxErrorDelta = draft.maxErrorDelta.trim() ? Number(draft.maxErrorDelta) : undefined;
    const baselineConfig =
      minPassRate === undefined && maxErrorDelta === undefined
        ? null
        : {
            ...(minPassRate !== undefined && { minPassRate }),
            ...(maxErrorDelta !== undefined && { maxErrorDelta }),
          };

    const payload = {
      workspaceId,
      name: draft.name.trim(),
      scheduleCron: draft.scheduleCron.trim(),
      targetType: draft.targetType,
      targetRef: draft.targetRef.trim(),
      profiles: [],
      registryScope: null,
      baselineConfig,
      alertChannels: draft.channels.map((c) => ({ type: c.type, target: c.target.trim() })),
      enabled: draft.enabled,
    };

    if (editing && target) {
      update.mutate({ ...payload, id: target.id });
    } else {
      create.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit scheduled check" : "New scheduled check"}</DialogTitle>
          <DialogDescription>
            We fetch the target on this schedule, score it, and alert you when conformance drops
            below your baseline.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="check-name">Name</Label>
            <Input
              id="check-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nightly Patient feed"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="check-schedule">Schedule</Label>
              <Select
                value={usingPreset ? draft.scheduleCron : CUSTOM}
                onValueChange={(v) => set("scheduleCron", v === CUSTOM ? "" : v)}
              >
                <SelectTrigger id="check-schedule" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRON_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM}>Custom cron</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="check-target-type">Target</Label>
              <Select
                value={draft.targetType}
                onValueChange={(v) => set("targetType", v as TargetType)}
              >
                <SelectTrigger id="check-target-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!usingPreset && (
            <div className="space-y-2">
              <Label htmlFor="check-cron">Cron expression</Label>
              <Input
                id="check-cron"
                value={draft.scheduleCron}
                onChange={(e) => set("scheduleCron", e.target.value)}
                placeholder="0 */6 * * *"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Five fields: minute, hour, day of month, month, day of week.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="check-target">
              {draft.targetType === "upload_folder" ? "Folder prefix" : "URL"}
            </Label>
            <Input
              id="check-target"
              value={draft.targetRef}
              onChange={(e) => set("targetRef", e.target.value)}
              placeholder={targetOption.placeholder}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">{targetOption.hint}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="check-passrate">Minimum conformance</Label>
              <Input
                id="check-passrate"
                value={draft.minPassRate}
                onChange={(e) => set("minPassRate", e.target.value)}
                placeholder="90"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Percent. Alert when a run scores below this.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-delta">Error growth allowed</Label>
              <Input
                id="check-delta"
                value={draft.maxErrorDelta}
                onChange={(e) => set("maxErrorDelta", e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Alert when errors rise by more than this since the last run.
              </p>
            </div>
          </div>

          <ChannelEditor
            channels={draft.channels}
            editing={editing}
            onChange={(channels) => set("channels", channels)}
          />

          <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Run on this schedule</p>
              <p className="text-xs text-muted-foreground">
                Turn off to keep the check without firing it.
              </p>
            </div>
            <Switch
              checked={draft.enabled}
              onCheckedChange={(v) => set("enabled", v)}
              aria-label="Run on this schedule"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={incomplete || busy}>
              {busy ? "Saving..." : editing ? "Save changes" : "Create check"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const CHANNEL_PLACEHOLDER: Record<ChannelType, string> = {
  email: "alerts@example.org",
  slack: "https://hooks.slack.com/services/...",
  webhook: "https://example.org/drift",
};

function ChannelEditor({
  channels,
  editing,
  onChange,
}: {
  channels: { type: ChannelType; target: string }[];
  editing: boolean;
  onChange: (channels: { type: ChannelType; target: string }[]) => void;
}) {
  const update = (i: number, patch: Partial<{ type: ChannelType; target: string }>) =>
    onChange(channels.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  return (
    <div className="space-y-2">
      <Label>Alert channels</Label>
      {channels.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {editing
            ? "Existing channels are encrypted and cannot be shown. Add a row to replace them."
            : "No channels yet. Drift alerts will still show on this page."}
        </p>
      ) : (
        <div className="space-y-2">
          {channels.map((c, i) => (
            <div key={`${c.type}-${i}`} className="flex items-center gap-2">
              <Select value={c.type} onValueChange={(v) => update(i, { type: v as ChannelType })}>
                <SelectTrigger className="w-32 shrink-0" aria-label="Channel type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="webhook">Webhook</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={c.target}
                onChange={(e) => update(i, { target: e.target.value })}
                placeholder={CHANNEL_PLACEHOLDER[c.type]}
                aria-label={`${c.type} target`}
                className="min-w-0 flex-1 font-mono text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove channel"
                onClick={() => onChange(channels.filter((_, idx) => idx !== i))}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...channels, { type: "email", target: "" }])}
      >
        <Plus />
        Add channel
      </Button>
    </div>
  );
}
