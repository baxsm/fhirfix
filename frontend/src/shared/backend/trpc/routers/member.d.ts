export declare const memberRouter: import("@trpc/server").TRPCBuiltRouter<{
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
            members: ({
                id: string;
                organizationId: string;
                role: "member" | "billing" | "owner" | "admin" | "auditor";
                createdAt: Date;
                userId: string;
                user: {
                    id: string;
                    email: string;
                    name: string;
                    image?: string | undefined;
                };
            } & {
                user: {
                    id: string;
                    name: string;
                    email: string;
                    image: string | null | undefined;
                };
            })[];
            total: number;
        };
        meta: object;
    }>;
    invite: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            email: string;
            role?: "member" | "billing" | "owner" | "admin" | "auditor" | undefined;
        };
        output: {
            id: string;
            organizationId: string;
            email: string;
            role: "member" | "billing" | "owner" | "admin" | "auditor";
            status: import("better-auth/plugins").InvitationStatus;
            inviterId: string;
            expiresAt: Date;
            createdAt: Date;
        } | {
            id: string;
            organizationId: string;
            email: string;
            role: "member" | "billing" | "owner" | "admin" | "auditor";
            status: import("better-auth/plugins").InvitationStatus;
            inviterId: string;
            expiresAt: Date;
            createdAt: Date;
        };
        meta: object;
    }>;
    updateRole: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            memberId: string;
            role: "member" | "billing" | "owner" | "admin" | "auditor";
        };
        output: {
            id: string;
            organizationId: string;
            role: "admin" | "member" | "owner";
            createdAt: Date;
            userId: string;
            user: {
                id: string;
                email: string;
                name: string;
                image?: string | undefined;
            };
        };
        meta: object;
    }>;
    remove: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            memberId: string;
        };
        output: {
            member: {
                id: string;
                organizationId: string;
                role: "member" | "billing" | "owner" | "admin" | "auditor";
                createdAt: Date;
                userId: string;
                user: {
                    id: string;
                    email: string;
                    name: string;
                    image?: string | undefined;
                };
            };
        };
        meta: object;
    }>;
}>>;
