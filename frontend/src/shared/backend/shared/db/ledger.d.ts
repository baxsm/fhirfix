import type { Db } from "./client";
export type LedgerType = "purchase" | "debit" | "grant" | "refund" | "expiry" | "adjustment";
export declare function ensureBillingAccount(db: Db, workspaceId: string): Promise<{
    id: string;
    workspaceId: string;
    polarCustomerId: string | null;
    balanceMicroCredits: number;
    autoRechargeEnabled: boolean;
    autoRechargeThreshold: number | null;
    autoRechargeAmountCents: number | null;
    monthlySpendCapCents: number | null;
    billingContactUserId: string | null;
    lastAlertThreshold: number;
    createdAt: Date;
} | undefined>;
export declare function postLedgerEntry(db: Db, args: {
    workspaceId: string;
    type: LedgerType;
    amountMicro: number;
    description: string;
    createdBy: string;
    relatedRunId?: string;
    relatedInvoiceId?: string;
    resetAlertThreshold?: boolean;
}): Promise<{
    balanceAfter: number;
    entryId: string;
}>;
export declare function grantTrialCredits(db: Db, workspaceId: string, createdBy: string): Promise<{
    balanceAfter: number;
    entryId: string;
}>;
export declare function reconcileBalance(db: Db, workspaceId: string): Promise<number>;
