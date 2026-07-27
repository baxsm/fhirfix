import { Polar } from "@polar-sh/sdk";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks.js";
import { PRICING } from "@shared/db/credits";
import { env } from "./env";

let client: Polar | null = null;

export function isBillingConfigured(): boolean {
  return env.POLAR_ACCESS_TOKEN.length > 0;
}

function getPolar(): Polar {
  if (!isBillingConfigured()) {
    throw new Error("Billing is not configured.");
  }
  if (!client) {
    client = new Polar({ accessToken: env.POLAR_ACCESS_TOKEN, server: env.POLAR_MODE });
  }
  return client;
}

export function productIdForPack(packId: string): string | null {
  const byId: Record<string, string> = {
    pack_10: env.POLAR_PRODUCT_PACK_10,
    pack_25: env.POLAR_PRODUCT_PACK_25,
    pack_100: env.POLAR_PRODUCT_PACK_100,
  };
  const id = byId[packId] ?? "";
  return id.length > 0 ? id : null;
}

export async function createCheckout(args: {
  packId: string;
  productId: string;
  workspaceId: string;
  creditsMicro: number;
  customerExternalId: string;
}): Promise<{ url: string; id: string }> {
  const polar = getPolar();
  const successUrl = `${env.APP_URL}/app/${args.workspaceId}/billing?success=1`;
  const checkout = await polar.checkouts.create({
    products: [args.productId],
    successUrl,
    externalCustomerId: args.customerExternalId,
    metadata: {
      workspaceId: args.workspaceId,
      packId: args.packId,
      creditsMicro: String(args.creditsMicro),
    },
  });
  return { url: checkout.url, id: checkout.id };
}

export type ParsedOrder = {
  polarOrderId: string;
  workspaceId: string;
  creditsMicro: number;
  amountCents: number;
  customerId: string | null;
};

export function parseWebhook(
  rawBody: string,
  headers: Record<string, string>,
): {
  kind: "order.paid" | "order.refunded" | "ignored";
  order?: ParsedOrder;
} {
  const event = validateEvent(rawBody, headers, env.POLAR_WEBHOOK_SECRET);

  if (event.type === "order.paid" || event.type === "order.refunded") {
    const data = event.data;
    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    const workspaceId = typeof meta.workspaceId === "string" ? meta.workspaceId : "";
    const creditsMicro = typeof meta.creditsMicro === "string" ? Number(meta.creditsMicro) : 0;
    // ignore orders that did not originate from our checkout (no workspace tag).
    if (!workspaceId || !Number.isFinite(creditsMicro) || creditsMicro <= 0) {
      return { kind: "ignored" };
    }
    return {
      kind: event.type,
      order: {
        polarOrderId: data.id,
        workspaceId,
        creditsMicro,
        amountCents: data.totalAmount,
        customerId: data.customerId ?? null,
      },
    };
  }
  return { kind: "ignored" };
}

export { PRICING, WebhookVerificationError };
