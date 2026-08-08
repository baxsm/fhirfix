import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { PRICING } from "./credits";
import { recordNotification } from "./notifications";
import * as schema from "./schema/index";

// injected so this module stays free of the polar sdk and any one service's env
export type OffSessionCharge = (args: {
  packId: string;
  productId: string;
  workspaceId: string;
  creditsMicro: number;
  polarCustomerId: string;
}) => Promise<{ ok: true; orderId: string } | { ok: false; reason: string; detail: string }>;

export type AutoRechargeConfig = {
  charge: OffSessionCharge;
  productIdForPack: (packId: string) => string | null;
  isConfigured: () => boolean;
  onError?: (context: string, detail: string) => void;
};

// must not credit the ledger here; order.paid does that so crediting has one path
export async function performAutoRecharge(
  db: Db,
  config: AutoRechargeConfig,
  args: { workspaceId: string; rechargeCents: number },
): Promise<{ credited: boolean; balanceMicro: number }> {
  const { workspaceId, rechargeCents } = args;

  const [account] = await db
    .select({
      polarCustomerId: schema.billingAccount.polarCustomerId,
      balanceMicroCredits: schema.billingAccount.balanceMicroCredits,
    })
    .from(schema.billingAccount)
    .where(eq(schema.billingAccount.workspaceId, workspaceId))
    .limit(1);

  const balanceMicro = account?.balanceMicroCredits ?? 0;
  // no provider or no saved customer: nothing to charge. the balance stands.
  if (!config.isConfigured() || !account?.polarCustomerId) {
    return { credited: false, balanceMicro };
  }

  const pack = PRICING.packs.find((p) => p.cents === rechargeCents);
  const productId = pack ? config.productIdForPack(pack.id) : null;
  if (!pack || !productId) {
    config.onError?.("billing.autoRecharge", `no product for ${rechargeCents} cents`);
    return { credited: false, balanceMicro };
  }

  const result = await config.charge({
    packId: pack.id,
    productId,
    workspaceId,
    creditsMicro: pack.creditsMicro,
    polarCustomerId: account.polarCustomerId,
  });

  if (!result.ok) {
    config.onError?.("billing.autoRecharge", `${workspaceId}: ${result.reason} ${result.detail}`);
    // a failed top-up matters: the workspace is about to hit zero.
    await recordNotification(db, {
      workspaceId,
      channel: "email",
      type: "credits.low",
      target: "auto-recharge",
      status: "failed",
      metadata: { reason: result.reason, rechargeCents },
    });
    return { credited: false, balanceMicro };
  }

  // re-read because order.paid may not have landed; either value is true right now
  const [after] = await db
    .select({ balanceMicroCredits: schema.billingAccount.balanceMicroCredits })
    .from(schema.billingAccount)
    .where(eq(schema.billingAccount.workspaceId, workspaceId))
    .limit(1);

  return { credited: true, balanceMicro: after?.balanceMicroCredits ?? balanceMicro };
}
