"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InlineNote } from "@/components/ui/inline-note";
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

export function BillingControls({
  workspaceId,
  autoRecharge,
  spendCap,
  packs,
  onSaved,
}: {
  workspaceId: string;
  autoRecharge: AutoRecharge;
  spendCap: { monthlyCents: number | null };
  packs: { id: string; label: string; cents: number }[];
  onSaved: () => void;
}) {
  return (
    <section className="raised overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold leading-tight">Controls</h2>
        <p className="text-xs text-muted-foreground">
          What happens as the balance runs down, and when we tell you about it.
        </p>
      </div>
      <div className="divide-y">
        <AutoRechargeRow
          workspaceId={workspaceId}
          autoRecharge={autoRecharge}
          packs={packs}
          onSaved={onSaved}
        />
        <SpendCapRow workspaceId={workspaceId} spendCap={spendCap} onSaved={onSaved} />
      </div>
    </section>
  );
}

function AutoRechargeRow({
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

  const save = useMutation(
    trpc.billing.setAutoRecharge.mutationOptions({
      onSuccess: () => {
        toast.success("Auto-recharge preference saved");
        onSaved();
      },
      onError: (e) => toast.error(e.message ?? "Could not save auto-recharge."),
    }),
  );

  return (
    <form
      className="px-4 py-3.5"
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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor="ar-enabled" className="cursor-pointer text-sm font-medium">
            Auto-recharge
          </Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Top up automatically when the balance runs low.
          </p>
          <InlineNote className="mt-1">
            Saved as a preference, but charging is not connected yet.
          </InlineNote>
        </div>
        <Switch id="ar-enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ar-threshold" className="text-xs">
              When balance falls below
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                id="ar-threshold"
                type="number"
                min={0}
                step="1"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="h-8 tabular-nums"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ar-amount" className="text-xs">
              Recharge with
            </Label>
            <Select value={amountCents} onValueChange={setAmountCents}>
              <SelectTrigger id="ar-amount" className="h-8 w-full">
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

      {enabled && autoRecharge.blockedByCap && (
        <p className="mt-2.5 text-xs text-warning">
          Your monthly spend cap is already reached, so this would not fire even once connected.
        </p>
      )}

      {/* money settings take an explicit confirm - auto-saving a spend threshold on every keystroke */}
      {dirty && (
        <div className="mt-3 flex items-center justify-end gap-3">
          <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEnabled(autoRecharge.enabled);
              setThreshold(savedThreshold);
              setAmountCents(savedAmount);
            }}
          >
            Discard
          </Button>
          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
}

function SpendCapRow({
  workspaceId,
  spendCap,
  onSaved,
}: {
  workspaceId: string;
  spendCap: { monthlyCents: number | null };
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

  const savedDollars = spendCap.monthlyCents != null ? String(spendCap.monthlyCents / 100) : "100";
  const dirty =
    enabled !== (spendCap.monthlyCents != null) || (enabled && dollars !== savedDollars);

  const save = useMutation(
    trpc.billing.setSpendCap.mutationOptions({
      onSuccess: () => {
        toast.success("Spend cap saved");
        onSaved();
      },
      onError: (e) => toast.error(e.message ?? "Could not save the spend cap."),
    }),
  );

  return (
    <form
      className="px-4 py-3.5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          workspaceId,
          monthlyCents: enabled ? Math.round(Number(dollars) * 100) : null,
        });
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Label htmlFor="cap-enabled" className="cursor-pointer text-sm font-medium">
            Monthly spend alert
          </Label>
          {/* named "alert", not "cap", because that is what it does */}
          <p className="mt-0.5 text-xs text-muted-foreground">
            Email us a warning when purchases reach a monthly limit. It does not stop runs - your
            balance already does that.
          </p>
        </div>
        <Switch id="cap-enabled" checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <div className="mt-3 max-w-[16rem] space-y-1.5">
          <Label htmlFor="cap-amount" className="text-xs">
            Alert me after
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              id="cap-amount"
              type="number"
              min={0}
              step="10"
              value={dollars}
              onChange={(e) => setDollars(e.target.value)}
              className="h-8 tabular-nums"
            />
            <span className="shrink-0 text-xs text-muted-foreground">per month</span>
          </div>
        </div>
      )}

      {dirty && (
        <div className="mt-3 flex items-center justify-end gap-3">
          <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEnabled(spendCap.monthlyCents != null);
              setDollars(savedDollars);
            }}
          >
            Discard
          </Button>
          <Button type="submit" size="sm" disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
}
