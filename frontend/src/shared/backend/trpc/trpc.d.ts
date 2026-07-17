import { hasPermission } from "@/auth/permissions";
import { schema } from "@/lib/db";
export declare const OUT_OF_CREDITS = "OUT_OF_CREDITS";
export declare const router: import("@trpc/server").TRPCRouterBuilder<{
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
}>;
export declare const createCallerFactory: import("@trpc/server").TRPCRouterCallerFactory<{
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
}>;
export declare const publicProcedure: import("@trpc/server").TRPCProcedureBuilder<{
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
}, object, object, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
export declare const protectedProcedure: import("@trpc/server").TRPCProcedureBuilder<{
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
}, object, {
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        notificationPrefs?: string | null | undefined;
    };
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
    };
    db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
        $client: import("postgres").Sql<{}>;
    };
    headers: Bun.__internal.BunHeadersOverride;
}, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
export declare const workspaceProcedure: import("@trpc/server").TRPCProcedureBuilder<{
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
}, object, {
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        notificationPrefs?: string | null | undefined;
    };
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
    };
    role: "member" | "billing" | "owner" | "admin" | "auditor";
    workspaceId: string;
    db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
        $client: import("postgres").Sql<{}>;
    };
    headers: Bun.__internal.BunHeadersOverride;
}, {
    workspaceId: string;
}, {
    workspaceId: string;
}, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
export declare const creditGatedProcedure: import("@trpc/server").TRPCProcedureBuilder<{
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
}, object, {
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        notificationPrefs?: string | null | undefined;
    };
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
    };
    role: "member" | "billing" | "owner" | "admin" | "auditor";
    workspaceId: string;
    db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
        $client: import("postgres").Sql<{}>;
    };
    headers: Bun.__internal.BunHeadersOverride;
}, {
    workspaceId: string;
}, {
    workspaceId: string;
}, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
type Resource = Parameters<typeof hasPermission>[1];
type Action = Parameters<typeof hasPermission>[2];
export declare function enforceRole(resource: Resource, action: Action): import("@trpc/server").TRPCProcedureBuilder<{
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
}, object, {
    user: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        email: string;
        emailVerified: boolean;
        name: string;
        image?: string | null | undefined | undefined;
        notificationPrefs?: string | null | undefined;
    };
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
    };
    role: "member" | "billing" | "owner" | "admin" | "auditor";
    workspaceId: string;
    db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
        $client: import("postgres").Sql<{}>;
    };
    headers: Bun.__internal.BunHeadersOverride;
}, {
    workspaceId: string;
}, {
    workspaceId: string;
}, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
export {};
