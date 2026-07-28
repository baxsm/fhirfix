
export const MICRO_PER_CREDIT = 1_000_000;
export const MICRO_PER_DOLLAR = MICRO_PER_CREDIT; // 1 credit == $1

export const PRICING = {
  // $0.01 per FHIR resource validated in a run.
  perResourceCents: 1,
  packs: [
    { id: "pack_10", label: "$10", cents: 1000, creditsMicro: 10 * MICRO_PER_DOLLAR },
    { id: "pack_25", label: "$25", cents: 2500, creditsMicro: 25 * MICRO_PER_DOLLAR },
    { id: "pack_100", label: "$100", cents: 10000, creditsMicro: 100 * MICRO_PER_DOLLAR },
  ],
  // new workspaces get $5 of credits to try the product.
  trialGrantMicro: 5 * MICRO_PER_DOLLAR,
  // the premium plan. a recurring subscription, separate from prepaid credits:
  // runs still spend credits, this unlocks the conformance packet.
  premium: { cents: 49900, label: "$499" },
} as const;

export type CreditPack = (typeof PRICING.packs)[number];

export const PURCHASABLE_CENTS: readonly number[] = PRICING.packs.map((p) => p.cents);

export function isPurchasableCents(cents: number): boolean {
  return Number.isInteger(cents) && PURCHASABLE_CENTS.includes(cents);
}

export function microFromCents(cents: number): number {
  // cents -> micro-credits at 1:1 dollars-to-credits. $1 = 100 cents = 1_000_000 micro.
  return Math.round((cents / 100) * MICRO_PER_DOLLAR);
}

export function centsFromMicro(micro: number): number {
  return Math.round((micro / MICRO_PER_DOLLAR) * 100);
}

export function dollarsFromMicro(micro: number): number {
  return micro / MICRO_PER_DOLLAR;
}

// format micro-credits as a dollar string for display, e.g. 12_340_000 -> "$12.34".
export function formatDollars(micro: number): string {
  return `$${dollarsFromMicro(micro).toFixed(2)}`;
}

export function priceForRun({ resourceCount }: { resourceCount: number }): number {
  // always bill at least one resource, and never a truthy check: 0 must floor to 1
  const billable = resourceCount != null && resourceCount > 0 ? resourceCount : 1;
  return microFromCents(billable * PRICING.perResourceCents);
}

export function nextAlertThreshold(args: {
  balanceMicro: number;
  baselineMicro: number; // the balance at the top of this cycle (last top-up/grant)
  lastSent: number; // 0 | 50 | 75 | 100
}): 50 | 75 | 100 | null {
  const { balanceMicro, baselineMicro, lastSent } = args;
  if (baselineMicro <= 0) return null;
  const consumedPct = Math.max(0, Math.min(100, (1 - balanceMicro / baselineMicro) * 100));
  // find the highest crossed threshold above what we already sent.
  const crossed = ([100, 75, 50] as const).find((t) => consumedPct >= t && t > lastSent);
  return crossed ?? null;
}

export function hasCreditFloor(
  account:
    | {
        balanceMicroCredits: number | null;
        autoRechargeEnabled: boolean | null;
        autoRechargeThreshold: number | null;
        autoRechargeAmountCents: number | null;
      }
    | null
    | undefined,
): boolean {
  if (!account) return false;
  const balance = account.balanceMicroCredits ?? 0;
  const rechargeCanCover =
    account.autoRechargeEnabled === true &&
    account.autoRechargeThreshold != null &&
    account.autoRechargeAmountCents != null &&
    account.autoRechargeAmountCents > 0;
  return balance > 0 || rechargeCanCover;
}

export function evaluateAutoRecharge(args: {
  balanceMicro: number;
  enabled: boolean;
  thresholdMicro: number | null; // fire when balance falls below this
  rechargeAmountCents: number | null;
  spendThisCycleCents: number; // purchases already made this cycle
  monthlySpendCapCents: number | null;
}): { shouldRecharge: boolean; blockedByCap: boolean; rechargeCents: number } {
  const {
    balanceMicro,
    enabled,
    thresholdMicro,
    rechargeAmountCents,
    spendThisCycleCents,
    monthlySpendCapCents,
  } = args;

  if (!enabled || thresholdMicro == null || rechargeAmountCents == null || rechargeAmountCents <= 0) {
    return { shouldRecharge: false, blockedByCap: false, rechargeCents: 0 };
  }
  const belowThreshold = balanceMicro < thresholdMicro;
  if (!belowThreshold) {
    return { shouldRecharge: false, blockedByCap: false, rechargeCents: 0 };
  }
  // a cap is only a blocker if THIS recharge would push spend past it.
  if (monthlySpendCapCents != null && spendThisCycleCents + rechargeAmountCents > monthlySpendCapCents) {
    return { shouldRecharge: false, blockedByCap: true, rechargeCents: 0 };
  }
  return { shouldRecharge: true, blockedByCap: false, rechargeCents: rechargeAmountCents };
}
