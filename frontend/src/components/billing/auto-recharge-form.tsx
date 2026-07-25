"use client";

import { useMutation } from "@tanstack/react-query";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/settings-section";
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
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";

type AutoRecharge = {
  enabled: boolean;
  thresholdDollars: number | null;
  amountCents: number | null;
  blockedByCap: boolean;
};

// keep the recharge amount options aligned with the buyable packs.
export function AutoRechargeForm({
  workspaceId,
  autoRecharge,
  packs,
  onSaved,
}: {
  workspaceId: string;
  autoRecharge: AutoRecharge;
  packs: { id: string; label: string; cents: number }[];
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [enabled, setEnabled] = useState(autoRecharge.enabled);
  const [threshold, setThreshold] = useState(
    autoRecharge.thresholdDollars != null ? String(autoRecharge.thresholdDollars) : "5",
  );
  const [amountCents, setAmountCents] = useState(
    autoRecharge.amountCents != null
      ? String(autoRecharge.amountCents)
      : String(packs[1]?.cents ?? 2500),
  );

  useEffect(() => {
    setEnabled(autoRecharge.enabled);
    if (autoRecharge.thresholdDollars != null) setThreshold(String(autoRecharge.thresholdDollars));
    if (autoRecharge.amountCents != null) setAmountCents(String(autoRecharge.amountCents));
  }, [autoRecharge.enabled, autoRecharge.thresholdDollars, autoRecharge.amountCents]);

  const savedThreshold =
    autoRecharge.thresholdDollars != null ? String(autoRecharge.thresholdDollars) : "5";
  const savedAmount =
    autoRecharge.amountCents != null
      ? String(autoRecharge.amountCents)
      : String(packs[1]?.cents ?? 2500);
  const dirty =
    enabled !== autoRecharge.enabled ||
    (enabled && (threshold !== savedThreshold || amountCents !== savedAmount));

  const reset = () => {
    setEnabled(autoRecharge.enabled);
    setThreshold(savedThreshold);
    setAmountCents(savedAmount);
  };

  const save = useMutation(
    trpc.billing.setAutoRecharge.mutationOptions({
      onSuccess: () => {
        toast.success("Auto-recharge saved");
        onSaved();
      },
      onError: (e) => toast.error(e.message ?? "Could not save auto-recharge."),
    }),
  );

  return (
    <SettingsSection
      icon={RefreshCw}
      title="Auto-recharge"
      description="Top up automatically when your balance runs low, so runs never stop mid-flow."
    >
      <form
        className="flex h-full flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            workspaceId,
            enabled,
            thresholdDollars: enabled ? Number(threshold) : undefined,
            amountCents: enabled ? Number(amountCents) : undefined,
          });
        }}
      >
        {/* the toggle is a switch, not a checkbox gating dead fields. disabled
            inputs that stay on screen read as broken - the user cannot tell
            whether the value matters. off means the settings are not there. */}
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="ar-enabled" className="cursor-pointer text-sm font-medium">
            Top up automatically
          </Label>
          <Switch id="ar-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ar-threshold">When balance falls below</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  id="ar-threshold"
                  type="number"
                  min={0}
                  step="1"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ar-amount">Recharge with</Label>
              <Select value={amountCents} onValueChange={setAmountCents}>
                <SelectTrigger id="ar-amount" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {packs.map((p) => (
                    <SelectItem key={p.id} value={String(p.cents)}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* the honest gotcha: a reached spend cap silently blocks the recharge. */}
        {enabled && autoRecharge.blockedByCap && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs text-warning">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Your monthly spend cap is reached, so this recharge will not fire. Runs will stop at
              zero balance until the cap resets or you raise it.
            </span>
          </div>
        )}

        {/* the save row only exists when something has actually changed.
            a permanently-pinned button meant the card grew and shrank as the
            form did, and there was nothing to save most of the time anyway.
            money settings still take an explicit confirm - auto-saving a
            spend threshold on every keystroke would fire real charges. */}
        {dirty && (
          <div className="mt-auto flex items-center justify-end gap-3 border-t pt-3">
            <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Discard
            </Button>
            <Button type="submit" size="sm" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </form>
    </SettingsSection>
  );
}
