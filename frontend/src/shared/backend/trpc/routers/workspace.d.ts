import { schema } from "@/lib/db";
export declare const workspaceRouter: import("@trpc/server").TRPCBuiltRouter<{
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
        input: void;
        output: {
            id: string;
            name: string;
            slug: string;
            createdAt: Date;
            logo?: string | null | undefined;
            metadata?: any;
        }[];
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            name: string;
            slug: string;
        };
        output: {
            id: string;
            name: string;
            slug: string;
            createdAt: Date;
            logo?: string | null | undefined;
            metadata?: any;
        } & {
            metadata: any;
            members: ({
                id: string;
                organizationId: string;
                userId: string;
                role: string;
                createdAt: Date;
            } | undefined)[];
        };
        meta: object;
    }>;
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            organization: ({
                members: {
                    id: string;
                    organizationId: string;
                    role: "admin" | "auditor" | "billing" | "member" | "owner";
                    createdAt: Date;
                    userId: string;
                    user: {
                        id: string;
                        email: string;
                        name: string;
                        image?: string | undefined;
                    };
                }[];
                invitations: {
                    id: string;
                    organizationId: string;
                    email: string;
                    role: "admin" | "auditor" | "billing" | "member" | "owner";
                    status: import("better-auth/plugins").InvitationStatus;
                    inviterId: string;
                    expiresAt: Date;
                    createdAt: Date;
                }[];
            } & {
                id: string;
                name: string;
                slug: string;
                createdAt: Date;
                logo?: string | null | undefined;
                metadata?: any;
            }) | null;
            settings: {
                id: string;
                workspaceId: string;
                defaultProfiles: string[];
                defaultTerminologyServer: string | null;
                redactionPolicy: "off" | "on_ingest" | "required";
                dataRetentionDays: number;
                baaStatus: "none" | "requested" | "signed";
                planTier: "free" | "premium" | "team";
                createdAt: Date;
                updatedAt: Date;
            } | null;
            role: "admin" | "auditor" | "billing" | "member" | "owner";
        };
        meta: object;
    }>;
    updateSettings: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            defaultProfiles?: string[] | undefined;
            defaultTerminologyServer?: string | null | undefined;
            redactionPolicy?: "off" | "on_ingest" | "required" | undefined;
            dataRetentionDays?: number | undefined;
        };
        output: {
            id: string;
            workspaceId: string;
            defaultProfiles: string[];
            defaultTerminologyServer: string | null;
            redactionPolicy: "off" | "on_ingest" | "required";
            dataRetentionDays: number;
            baaStatus: "none" | "requested" | "signed";
            planTier: "free" | "premium" | "team";
            createdAt: Date;
            updatedAt: Date;
        };
        meta: object;
    }>;
    ssoGet: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            configured: false;
        };
        meta: object;
    }>;
}>>;
