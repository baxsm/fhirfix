"use client";

import { useMutation } from "@tanstack/react-query";
import { Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/dashboard/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";

type SpendCap = {
  monthlyCents: number | null;
  spentThisCycleCents: number;
};

export function SpendCapForm({
  workspaceId,
  spendCap,
  onSaved,
}: {
  workspaceId: string;
  spendCap: SpendCap;
  onSaved: () => void;
}) {
  const trpc = useTRPC();
  const [enabled, setEnabled] = useState(spendCap.monthlyCents != null);
  const [dollars, setDollars] = useState(
    spendCap.monthlyCents != null ? String(spendCap.monthlyCents / 100) : "100",
  );

  useEffect(() => {
    setEnabled(spendCap.monthlyCents != null);
    if (spendCap.monthlyCents != null) setDollars(String(spendCap.monthlyCents / 100));
  }, [spendCap.monthlyCents]);

  const savedEnabled = spendCap.monthlyCents != null;
  const savedDollars = spendCap.monthlyCents != null ? String(spendCap.monthlyCents / 100) : "100";
  const dirty = enabled !== savedEnabled || (enabled && dollars !== savedDollars);
  const reset = () => {
    setEnabled(savedEnabled);
    setDollars(savedDollars);
  };

  const save = useMutation(
    trpc.billing.setSpendCap.mutationOptions({
      onSuccess: () => {
        toast.success("Spend cap saved");
        onSaved();
      },
      onError: (e) => toast.error(e.message ?? "Could not save spend cap."),
    }),
  );

  const spentDollars = spendCap.spentThisCycleCents / 100;
  const capDollars = Number(dollars);
  const pct =
    enabled && capDollars > 0 ? Math.min(100, Math.round((spentDollars / capDollars) * 100)) : 0;

  return (
    <SettingsSection
      icon={Gauge}
      title="Monthly spend cap"
      description="Get alerted when purchases reach a monthly limit. This notifies you; it does not stop runs."
    >
      <form
        className="flex h-full flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            workspaceId,
            monthlyCents: enabled ? Math.round(Number(dollars) * 100) : null,
          });
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="cap-enabled" className="cursor-pointer text-sm font-medium">
            Alert me at a monthly limit
          </Label>
          <Switch id="cap-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <div className="space-y-1.5 border-t pt-4">
            <Label htmlFor="cap-amount">Cap</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="cap-amount"
                type="number"
                min={0}
                step="1"
                value={dollars}
                onChange={(e) => setDollars(e.target.value)}
                className="w-32 tabular-nums"
              />
              <span className="text-sm text-muted-foreground">per month</span>
            </div>
          </div>
        )}

        {enabled && capDollars > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                <span className="font-mono tabular-nums text-foreground">
                  ${spentDollars.toFixed(2)}
                </span>{" "}
                of ${capDollars.toFixed(2)} this month
              </span>
              <span className="font-mono tabular-nums">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-warning transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          A cap only sends an alert. Runs are already limited by your credit balance, so a cap will
          not cut off service on its own.
        </p>

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
