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
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
            };
            output: {
                id: string;
                name: string;
                prefix: string;
                mode: "test" | "live";
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
                mode: "test" | "live";
                scopes?: ("validate" | "convert" | "fix" | "runs" | "mappings")[] | undefined;
            };
            output: {
                id: string;
                name: string;
                mode: "test" | "live";
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
                events: ("run.completed" | "run.failed" | "batch.completed" | "credits.low")[];
            };
            output: {
                id: string;
                url: string;
                events: ("run.completed" | "run.failed" | "batch.completed" | "credits.low")[];
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
                event?: "run.completed" | "run.failed" | "batch.completed" | "credits.low" | undefined;
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
        stats: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
            };
            output: {
                windowHours: number;
                total: number;
                errors: number;
                p95Ms: number;
                topPaths: {
                    path: string;
                    count: number;
                    errors: number;
                }[];
            };
            meta: object;
        }>;
    }>>;
}>>;
