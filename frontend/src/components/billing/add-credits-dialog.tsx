"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

/**
 * one "Add credits" action instead of three bare Add $10 / $25 / $100 buttons on
 * the balance row. three equal-weight buttons made the most consequential row on
 * the page look like a toolbar, and none of them said what pressing it would do
 * (it leaves for a hosted checkout).
 *
 * the amounts are FIXED and come from the server's pack list. that is a
 * deliberate product decision, not a shortcut: a prepaid balance with arbitrary
 * amounts complicates refunds and invoicing for no user benefit, which is why
 * prepaid-credit products settle on packs. the server rejects anything not in
 * PRICING.packs (isPurchasableCents) and rate limits checkout, so the ui list is
 * a convenience, never the enforcement.
 */
export function AddCreditsDialog({
  workspaceId,
  packs,
  open,
  onOpenChange,
  billingConfigured,
}: {
  workspaceId: string;
  packs: { id: string; label: string; cents: number }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingConfigured: boolean;
}) {
  const trpc = useTRPC();
  // default to the middle pack rather than the cheapest: preselecting the
  // smallest reads as a nudge to spend the least, and most top-ups are not $10.
  const [packId, setPackId] = useState(packs[1]?.id ?? packs[0]?.id ?? "");

  useEffect(() => {
    if (open) setPackId(packs[1]?.id ?? packs[0]?.id ?? "");
  }, [open, packs]);

  const checkout = useMutation(
    trpc.billing.checkout.mutationOptions({
      onSuccess: ({ url }) => {
        window.location.href = url;
      },
      onError: (e) => toast.error(e.message ?? "Could not start checkout."),
    }),
  );

  const selected = packs.find((p) => p.id === packId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add credits</DialogTitle>
          <DialogDescription>
            Credits are prepaid and do not expire. 1 credit is $1 and covers 100 validated
            resources.
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Credit amount" className="grid gap-2">
          {packs.map((p) => {
            const active = p.id === packId;
            const resources = Math.round(p.cents);
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPackId(p.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                  active
                    ? "border-foreground/25 bg-muted"
                    : "border-border hover:border-foreground/20 hover:bg-muted/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    active ? "border-primary bg-primary" : "border-input bg-background",
                  )}
                >
                  {active && <span className="size-1.5 rounded-full bg-primary-foreground" />}
                </span>
                <span className="font-mono text-sm font-medium tabular-nums">{p.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{resources.toLocaleString()}</span>{" "}
                  resources
                </span>
              </button>
            );
          })}
        </div>

        {!billingConfigured && (
          <p className="text-xs text-muted-foreground">
            Checkout is not connected yet, so this will not complete. You are running on granted
            credits.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!selected || checkout.isPending || !billingConfigured}
            onClick={() => selected && checkout.mutate({ workspaceId, packId: selected.id })}
          >
            {checkout.isPending && <Loader2 className="size-3.5 animate-spin" />}
            {checkout.isPending ? "Opening checkout..." : `Continue to checkout`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
