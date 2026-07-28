export declare const MICRO_PER_CREDIT = 1000000;
export declare const MICRO_PER_DOLLAR = 1000000;
export declare const PRICING: {
    readonly perResourceCents: 1;
    readonly packs: readonly [{
        readonly id: "pack_10";
        readonly label: "$10";
        readonly cents: 1000;
        readonly creditsMicro: number;
    }, {
        readonly id: "pack_25";
        readonly label: "$25";
        readonly cents: 2500;
        readonly creditsMicro: number;
    }, {
        readonly id: "pack_100";
        readonly label: "$100";
        readonly cents: 10000;
        readonly creditsMicro: number;
    }];
    readonly trialGrantMicro: number;
    readonly premium: {
        readonly cents: 49900;
        readonly label: "$499";
    };
};
export type CreditPack = (typeof PRICING.packs)[number];
export declare const PURCHASABLE_CENTS: readonly number[];
export declare function isPurchasableCents(cents: number): boolean;
export declare function microFromCents(cents: number): number;
export declare function centsFromMicro(micro: number): number;
export declare function dollarsFromMicro(micro: number): number;
export declare function formatDollars(micro: number): string;
export declare function priceForRun({ resourceCount }: {
    resourceCount: number;
}): number;
export declare function nextAlertThreshold(args: {
    balanceMicro: number;
    baselineMicro: number;
    lastSent: number;
}): 50 | 75 | 100 | null;
export declare function hasCreditFloor(account: {
    balanceMicroCredits: number | null;
    autoRechargeEnabled: boolean | null;
    autoRechargeThreshold: number | null;
    autoRechargeAmountCents: number | null;
} | null | undefined): boolean;
export declare function evaluateAutoRecharge(args: {
    balanceMicro: number;
    enabled: boolean;
    thresholdMicro: number | null;
    rechargeAmountCents: number | null;
    spendThisCycleCents: number;
    monthlySpendCapCents: number | null;
}): {
    shouldRecharge: boolean;
    blockedByCap: boolean;
    rechargeCents: number;
};
