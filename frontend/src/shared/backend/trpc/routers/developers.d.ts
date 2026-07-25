import type { WebhookEvent } from "@shared/db/webhooks";
import { schema } from "@/lib/db";
export declare const developersRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    apiKeys: import("@trpc/server").TRPCBuiltRouter<{
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
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
            };
            output: {
                id: string;
                name: string;
                prefix: string;
                mode: "live" | "test";
                scopes: string[];
                createdAt: Date;
                lastUsedAt: Date | null;
                revokedAt: Date | null;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                name: string;
                mode: "live" | "test";
                scopes?: ("convert" | "fix" | "mappings" | "runs" | "validate")[] | undefined;
            };
            output: {
                id: string;
                name: string;
                mode: "live" | "test";
                prefix: string;
                key: string;
            };
            meta: object;
        }>;
        revoke: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                keyId: string;
            };
            output: {
                revoked: boolean;
            };
            meta: object;
        }>;
    }>>;
    webhooks: import("@trpc/server").TRPCBuiltRouter<{
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
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
            };
            output: {
                id: string;
                url: string;
                events: string[];
                enabled: boolean;
                lastDeliveryStatus: string | null;
                lastDeliveryAt: Date | null;
                createdAt: Date;
            }[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                url: string;
                events: ("batch.completed" | "credits.low" | "run.completed" | "run.failed")[];
            };
            output: {
                id: string;
                url: string;
                events: ("batch.completed" | "credits.low" | "run.completed" | "run.failed")[];
                secret: string;
            };
            meta: object;
        }>;
        rotateSecret: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                id: string;
            };
            output: {
                secret: string;
            };
            meta: object;
        }>;
        setEnabled: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                id: string;
                enabled: boolean;
            };
            output: {
                enabled: boolean;
            };
            meta: object;
        }>;
        delete: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                id: string;
            };
            output: {
                deleted: boolean;
            };
            meta: object;
        }>;
        testPing: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                event?: "batch.completed" | "credits.low" | "run.completed" | "run.failed" | undefined;
            };
            output: {
                dispatched: boolean;
                event: WebhookEvent;
            };
            meta: object;
        }>;
    }>>;
    requestLogs: import("@trpc/server").TRPCBuiltRouter<{
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
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
                method?: string | undefined;
                statusCode?: number | undefined;
                onlyErrors?: boolean | undefined;
                cursor?: string | undefined;
                limit?: number | undefined;
            };
            output: {
                logs: {
                    id: string;
                    method: string;
                    path: string;
                    statusCode: number;
                    latencyMs: number;
                    requestBytes: number | null;
                    responseBytes: number | null;
                    idempotencyKey: string | null;
                    runId: string | null;
                    apiKeyId: string | null;
                    errorCode: string | null;
                    ip: string | null;
                    createdAt: Date;
                }[];
                nextCursor: string | null;
                hasMore: boolean;
            };
            meta: object;
        }>;
    }>>;
}>>;
