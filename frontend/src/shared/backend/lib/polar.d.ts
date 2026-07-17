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
export type ParsedOrder = {
    polarOrderId: string;
    workspaceId: string;
    creditsMicro: number;
    amountCents: number;
    customerId: string | null;
};
export declare function parseWebhook(rawBody: string, headers: Record<string, string>): {
    kind: "order.paid" | "order.refunded" | "ignored";
    order?: ParsedOrder;
};
export { PRICING, WebhookVerificationError };
