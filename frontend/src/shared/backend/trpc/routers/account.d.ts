export declare const accountRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof import("../../shared/db/schema")> & {
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
            ipAddress?: string | null | undefined;
            userAgent?: string | null | undefined;
            activeOrganizationId?: string | null | undefined;
        } | null;
        user: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            email: string;
            emailVerified: boolean;
            name: string;
            image?: string | null | undefined;
            notificationPrefs?: string | null | undefined;
        } | null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            id: string;
            name: string;
            email: string;
            image: string | null | undefined;
            emailVerified: boolean;
            notificationPrefs: {
                runComplete: boolean;
                driftAlerts: boolean;
                lowBalance: boolean;
                productUpdates: boolean;
            };
        };
        meta: object;
    }>;
    updateProfile: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name?: string | undefined;
            image?: string | null | undefined;
        };
        output: {
            ok: boolean;
        };
        meta: object;
    }>;
    changePassword: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            currentPassword: string;
            newPassword: string;
            revokeOtherSessions?: boolean | undefined;
        };
        output: {
            ok: boolean;
        };
        meta: object;
    }>;
    notificationPrefs: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            runComplete?: boolean | undefined;
            driftAlerts?: boolean | undefined;
            lowBalance?: boolean | undefined;
            productUpdates?: boolean | undefined;
        };
        output: {
            runComplete: boolean;
            driftAlerts: boolean;
            lowBalance: boolean;
            productUpdates: boolean;
        };
        meta: object;
    }>;
}>>;
