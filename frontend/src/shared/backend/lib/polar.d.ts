import { WebhookVerificationError } from "@polar-sh/sdk/webhooks.js";
import { PRICING } from "@shared/db/credits";
export declare function isBillingConfigured(): boolean;
export declare function productIdForPack(packId: string): string | null;
export declare function createCheckout(args: {
    packId: string;
    productId: string;
    workspaceId: string;
    creditsMicro: number;
    customerExternalId: string;
}): Promise<{
    url: string;
    id: string;
}>;
export declare function premiumProductId(): string | null;
export declare function createPremiumCheckout(args: {
    productId: string;
    workspaceId: string;
    customerExternalId: string;
}): Promise<{
    url: string;
    id: string;
}>;
export type OffSessionResult = {
    ok: true;
    orderId: string;
} | {
    ok: false;
    reason: "no_payment_method" | "declined" | "not_enabled" | "error";
    detail: string;
};
export declare function chargeSavedMethod(args: {
    packId: string;
    productId: string;
    workspaceId: string;
    creditsMicro: number;
    polarCustomerId: string;
}): Promise<OffSessionResult>;
export type ParsedOrder = {
    polarOrderId: string;
    workspaceId: string;
    creditsMicro: number;
    amountCents: number;
    customerId: string | null;
};
export type ParsedSubscription = {
    workspaceId: string;
    active: boolean;
};
export declare function parseWebhook(rawBody: string, headers: Record<string, string>): {
    kind: "order.paid" | "order.refunded" | "subscription" | "ignored";
    order?: ParsedOrder;
    subscription?: ParsedSubscription;
};
export { PRICING, WebhookVerificationError };
