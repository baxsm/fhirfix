import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { PRICING } from "./credits";
import { recordNotification } from "./notifications";
import * as schema from "./schema/index";

// the provider call, injected so this module stays free of the polar sdk and of
// any one service's env. both backend and worker complete runs, so both register
// the same implementation rather than each keeping their own copy of the logic.
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

// charges the workspace's saved payment method for the configured top-up. the
// ledger is NOT credited here: the order.paid webhook does that, so a manual
// checkout and an auto-recharge credit by exactly one path.
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

  // the charge succeeded, but order.paid credits the ledger and may not have
  // landed yet. re-read: if the webhook already ran the balance is current, and
  // if it has not, reporting the pre-charge balance is still true right now.
  const [after] = await db
    .select({ balanceMicroCredits: schema.billingAccount.balanceMicroCredits })
    .from(schema.billingAccount)
    .where(eq(schema.billingAccount.workspaceId, workspaceId))
    .limit(1);

  return { credited: true, balanceMicro: after?.balanceMicroCredits ?? balanceMicro };
}
