import { type AutoRechargeConfig, performAutoRecharge } from "@shared/db/auto-recharge";
import { db } from "./db";
import { logger } from "./logger";
import { chargeSavedMethod, isBillingConfigured, productIdForPack } from "./polar";

const config: AutoRechargeConfig = {
  charge: chargeSavedMethod,
  productIdForPack,
  isConfigured: isBillingConfigured,
  onError: (context, detail) => logger.error(context, detail),
};

export async function runAutoRecharge(args: {
  workspaceId: string;
  rechargeCents: number;
}): Promise<{ credited: boolean; balanceMicro: number }> {
  return performAutoRecharge(db, config, args);
}
