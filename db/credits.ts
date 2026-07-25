// credit math and pricing. pure functions only, no db access, so the engine is
// unit-testable in isolation. money is integer cents, credits are integer
// micro-credits. 1 credit = 1_000_000 micro = $1.00. everything is shown to users
// in dollars; micro-credits never leave the backend.

export const MICRO_PER_CREDIT = 1_000_000;
export const MICRO_PER_DOLLAR = MICRO_PER_CREDIT; // 1 credit == $1

// one place to change pricing. per-resource price drives metering; packs drive
// what users can buy; the trial grant seeds a new workspace so the aha flow works
// before anyone pays. productId is filled from env at runtime (see backend polar.ts).
export const PRICING = {
  // $0.01 per FHIR resource validated in a run.
  perResourceCents: 1,
  // credit packs a user can buy. cents is what Polar charges; creditsMicro is what
  // lands in the ledger. 1:1 dollars-to-credits, no bonus tiers for now.
  packs: [
    { id: "pack_10", label: "$10", cents: 1000, creditsMicro: 10 * MICRO_PER_DOLLAR },
    { id: "pack_25", label: "$25", cents: 2500, creditsMicro: 25 * MICRO_PER_DOLLAR },
    { id: "pack_100", label: "$100", cents: 10000, creditsMicro: 100 * MICRO_PER_DOLLAR },
  ],
  // new workspaces get $5 of credits to try the product.
  trialGrantMicro: 5 * MICRO_PER_DOLLAR,
} as const;

export type CreditPack = (typeof PRICING.packs)[number];

// the ONLY amounts that may ever be charged, in cents. both the purchase path
// (checkout) and the auto-charging path (auto-recharge) validate against this, so
// a client cannot name its own price. auto-recharge previously accepted any
// integer >= 500 with no ceiling, which meant an arbitrary amount could be
// scheduled to charge without a human present.
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

// cost of a run in micro-credits. at least one resource is always billed so an
// empty/degenerate input is not free. use >= guards, never truthy checks (a
// resourceCount of 0 must floor to 1, not fall through).
export function priceForRun({ resourceCount }: { resourceCount: number }): number {
  const billable = resourceCount != null && resourceCount > 0 ? resourceCount : 1;
  return microFromCents(billable * PRICING.perResourceCents);
}

// low-balance alert thresholds are expressed as "percent of balance consumed
// against a baseline". we alert as the balance falls THROUGH 50%, 75%, and 100%
// consumed (i.e. 50%, 25%, 0% remaining). lastSent is the highest threshold
// already sent this cycle so we never re-fire. returns the new threshold to send,
// or null if nothing new crossed.
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

// can this workspace start a charged run? the exact cost is unknown until the
// input is parsed (resource count), so this is a floor check: the balance must be
// positive, OR auto-recharge with a real threshold+amount can cover the next run.
// both the tRPC creditGatedProcedure and the REST enforceCredits middleware call
// this, so the gate is defined once. tRPC maps false -> OUT_OF_CREDITS; REST -> 402.
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

// decide whether auto-recharge should fire, and surface the honest gotcha: a spend
// cap that is already reached this cycle BLOCKS the recharge (the Anthropic/Vercel
// footgun). the caller uses blockedByCap to warn the user their apps will stop
// despite auto-recharge being on.
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
