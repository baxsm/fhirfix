import { describe, expect, test } from "bun:test";
import {
  dollarsFromMicro,
  evaluateAutoRecharge,
  formatDollars,
  MICRO_PER_DOLLAR,
  microFromCents,
  nextAlertThreshold,
  PRICING,
  priceForRun,
} from "@shared/db/credits";

describe("credit conversions", () => {
  test("cents -> micro at 1:1 dollars-to-credits", () => {
    expect(microFromCents(100)).toBe(MICRO_PER_DOLLAR); // $1 = 1_000_000 micro
    expect(microFromCents(1)).toBe(10_000); // 1 cent = $0.01 = 10_000 micro
  });

  test("micro -> dollars and formatting", () => {
    expect(dollarsFromMicro(5_000_000)).toBe(5);
    expect(formatDollars(12_340_000)).toBe("$12.34");
    expect(formatDollars(0)).toBe("$0.00");
  });
});

describe("priceForRun", () => {
  test("bills per resource at $0.01", () => {
    expect(priceForRun({ resourceCount: 1 })).toBe(10_000); // $0.01
    expect(priceForRun({ resourceCount: 3 })).toBe(30_000); // $0.03
    expect(priceForRun({ resourceCount: 100 })).toBe(1_000_000); // $1.00
  });

  test("a zero-resource run still bills one resource (no free run)", () => {
    // truthy-check safety: resourceCount 0 must floor to 1, not fall through.
    expect(priceForRun({ resourceCount: 0 })).toBe(10_000);
  });
});

describe("nextAlertThreshold", () => {
  const baselineMicro = 10 * MICRO_PER_DOLLAR; // $10 baseline

  test("no alert until 50% consumed", () => {
    expect(
      nextAlertThreshold({ balanceMicro: 6 * MICRO_PER_DOLLAR, baselineMicro, lastSent: 0 }),
    ).toBeNull();
  });

  test("fires 50 at half consumed", () => {
    expect(
      nextAlertThreshold({ balanceMicro: 5 * MICRO_PER_DOLLAR, baselineMicro, lastSent: 0 }),
    ).toBe(50);
  });

  test("fires 75 at three-quarters consumed", () => {
    expect(
      nextAlertThreshold({ balanceMicro: 2.5 * MICRO_PER_DOLLAR, baselineMicro, lastSent: 50 }),
    ).toBe(75);
  });

  test("fires 100 at empty", () => {
    expect(nextAlertThreshold({ balanceMicro: 0, baselineMicro, lastSent: 75 })).toBe(100);
  });

  test("dedup: does not re-fire a threshold already sent", () => {
    // 60% consumed, 50 already sent -> nothing new.
    expect(
      nextAlertThreshold({ balanceMicro: 4 * MICRO_PER_DOLLAR, baselineMicro, lastSent: 50 }),
    ).toBeNull();
  });

  test("skips straight to the highest crossed threshold", () => {
    // a single big run drops from full to empty: fire 100, not 50 then 75.
    expect(nextAlertThreshold({ balanceMicro: 0, baselineMicro, lastSent: 0 })).toBe(100);
  });

  test("no baseline means no alerts (avoid divide by zero)", () => {
    expect(nextAlertThreshold({ balanceMicro: 0, baselineMicro: 0, lastSent: 0 })).toBeNull();
  });
});

describe("evaluateAutoRecharge", () => {
  test("does not fire when disabled", () => {
    const r = evaluateAutoRecharge({
      balanceMicro: 0,
      enabled: false,
      thresholdMicro: MICRO_PER_DOLLAR,
      rechargeAmountCents: 1000,
      spendThisCycleCents: 0,
      monthlySpendCapCents: null,
    });
    expect(r.shouldRecharge).toBe(false);
  });

  test("fires when balance is below threshold and no cap blocks it", () => {
    const r = evaluateAutoRecharge({
      balanceMicro: 0,
      enabled: true,
      thresholdMicro: MICRO_PER_DOLLAR,
      rechargeAmountCents: 1000,
      spendThisCycleCents: 0,
      monthlySpendCapCents: null,
    });
    expect(r.shouldRecharge).toBe(true);
    expect(r.rechargeCents).toBe(1000);
  });

  test("does not fire when balance is above threshold", () => {
    const r = evaluateAutoRecharge({
      balanceMicro: 5 * MICRO_PER_DOLLAR,
      enabled: true,
      thresholdMicro: MICRO_PER_DOLLAR,
      rechargeAmountCents: 1000,
      spendThisCycleCents: 0,
      monthlySpendCapCents: null,
    });
    expect(r.shouldRecharge).toBe(false);
  });

  test("the cap gotcha: a reached spend cap BLOCKS the recharge", () => {
    // already spent $95 this cycle, cap is $100, a $10 recharge would exceed it.
    const r = evaluateAutoRecharge({
      balanceMicro: 0,
      enabled: true,
      thresholdMicro: MICRO_PER_DOLLAR,
      rechargeAmountCents: 1000,
      spendThisCycleCents: 9500,
      monthlySpendCapCents: 10000,
    });
    expect(r.shouldRecharge).toBe(false);
    expect(r.blockedByCap).toBe(true);
  });

  test("recharge within the cap still fires", () => {
    const r = evaluateAutoRecharge({
      balanceMicro: 0,
      enabled: true,
      thresholdMicro: MICRO_PER_DOLLAR,
      rechargeAmountCents: 1000,
      spendThisCycleCents: 5000,
      monthlySpendCapCents: 10000,
    });
    expect(r.shouldRecharge).toBe(true);
    expect(r.blockedByCap).toBe(false);
  });
});

describe("pricing config", () => {
  test("packs are 1:1 dollars to credits", () => {
    for (const p of PRICING.packs) {
      expect(p.creditsMicro).toBe(microFromCents(p.cents));
    }
  });

  test("trial grant is $5", () => {
    expect(PRICING.trialGrantMicro).toBe(5 * MICRO_PER_DOLLAR);
  });
});
