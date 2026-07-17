import type { Context as HonoContext } from "hono";
export declare function createTRPCContext(honoCtx: HonoContext): Promise<{
    db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof import("../shared/db/schema")> & {
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
}>;
export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
