import { schema } from "@/lib/db";
export declare const billingRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
            $client: import("postgres").Sql<{}>;
        };
        headers: Bun.__internal.BunHeadersOverride;
        session: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            expiresAt: Date;
            token: string;
            ipAddress?: string | null | undefined | undefined;
            userAgent?: string | null | undefined | undefined;
            activeOrganizationId?: string | null | undefined;
        } | null;
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            emailVerified: boolean;
            name: string;
            image?: string | null | undefined | undefined;
            notificationPrefs?: string | null | undefined;
        } | null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    summary: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            balanceDollars: number;
            resourcesRemaining: number;
            dailyBurnDollars: number;
            estimatedMonthlyDollars: number;
            daysRemaining: number | null;
            isTrial: boolean;
            billingConfigured: boolean;
            autoRecharge: {
                enabled: boolean;
                thresholdDollars: number | null;
                amountCents: number | null;
                blockedByCap: boolean;
            };
            spendCap: {
                monthlyCents: number | null;
                spentThisCycleCents: number;
            };
            packs: {
                id: "pack_10" | "pack_25" | "pack_100";
                label: "$10" | "$25" | "$100";
                cents: 1000 | 2500 | 10000;
            }[];
        };
        meta: object;
    }>;
    usage: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            days?: number | undefined;
        };
        output: {
            day: string;
            source: string;
            dollars: number;
        }[];
        meta: object;
    }>;
    ledger: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            limit?: number | undefined;
            offset?: number | undefined;
        };
        output: {
            amountDollars: number;
            balanceAfterDollars: number;
            id: string;
            type: "purchase" | "debit" | "grant" | "refund" | "expiry" | "adjustment";
            amountMicro: number;
            balanceAfter: number;
            description: string;
            relatedRunId: string | null;
            createdAt: Date;
        }[];
        meta: object;
    }>;
    invoices: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            id: string;
            amountCents: number;
            creditsPurchasedMicro: number;
            status: "draft" | "open" | "paid" | "void";
            issuedAt: Date;
            paidAt: Date | null;
        }[];
        meta: object;
    }>;
    checkout: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            packId: string;
        };
        output: {
            url: string;
        };
        meta: object;
    }>;
    setAutoRecharge: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            enabled: boolean;
            thresholdDollars?: number | undefined;
            amountCents?: number | undefined;
        };
        output: {
            enabled: boolean;
        };
        meta: object;
    }>;
    setSpendCap: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            monthlyCents: number | null;
        };
        output: {
            monthlyCents: number | null;
        };
        meta: object;
    }>;
}>>;
