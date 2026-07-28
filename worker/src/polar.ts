import { Polar } from "@polar-sh/sdk";
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

// create a draft order, then finalize it to charge the saved method off-session.
// the metadata matches a checkout order, so order.paid credits by the same path.
export async function chargeSavedMethod(args: {
  packId: string;
  productId: string;
  workspaceId: string;
  creditsMicro: number;
  polarCustomerId: string;
}): Promise<{ ok: true; orderId: string } | { ok: false; reason: string; detail: string }> {
  const polar = getPolar();
  try {
    const draft = await polar.orders.create({
      customerId: args.polarCustomerId,
      productId: args.productId,
      metadata: {
        workspaceId: args.workspaceId,
        packId: args.packId,
        creditsMicro: String(args.creditsMicro),
        autoRecharge: "true",
      },
    });
    const paid = await polar.orders.finalize({ id: draft.id });
    return { ok: true, orderId: paid.id };
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode;
    const detail = error instanceof Error ? error.message : String(error);
    if (status === 402) return { ok: false, reason: "declined", detail };
    if (status === 403) return { ok: false, reason: "not_enabled", detail };
    return { ok: false, reason: "error", detail };
  }
}
