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
        className="space-y-4"
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
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 rounded border-input accent-[var(--interactive)]"
          />
          <span className="font-medium">Enable auto-recharge</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
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
                disabled={!enabled}
                className="tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ar-amount">Recharge with</Label>
            <Select value={amountCents} onValueChange={setAmountCents} disabled={!enabled}>
              <SelectTrigger id="ar-amount">
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

        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </SettingsSection>
  );
}
