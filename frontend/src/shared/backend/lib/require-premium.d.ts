import type { Db } from "@shared/db/client";
export declare function requirePremiumPlan(db: Db, workspaceId: string, feature: string): Promise<void>;
