import type { Db } from "@shared/db/client";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { schema } from "./db";

// one definition, so a second premium feature cannot drift to a different answer
export async function requirePremiumPlan(
  db: Db,
  workspaceId: string,
  feature: string,
): Promise<void> {
  const [settings] = await db
    .select({ planTier: schema.workspaceSettings.planTier })
    .from(schema.workspaceSettings)
    .where(eq(schema.workspaceSettings.workspaceId, workspaceId))
    .limit(1);

  if (settings?.planTier !== "premium") {
    throw new TRPCError({ code: "FORBIDDEN", message: `${feature} is a premium feature.` });
  }
}
