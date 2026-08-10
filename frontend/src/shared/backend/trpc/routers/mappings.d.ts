import { schema } from "@/lib/db";
export declare const mappingsRouter: import("@trpc/server").TRPCBuiltRouter<{
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
            status?: "active" | "deprecated" | "rejected" | "suggested" | undefined;
            type?: "authority_to_system" | "code_to_code" | "custom" | "facility_to_org" | undefined;
            search?: string | undefined;
        };
        output: {
            id: string;
            scope: "source_system" | "workspace";
            sourceSystem: string | null;
            type: "authority_to_system" | "code_to_code" | "custom" | "facility_to_org";
            sourceValue: string;
            targetValue: string;
            targetSystem: string | null;
            status: "active" | "deprecated" | "rejected" | "suggested";
            confidence: number | null;
            version: number;
            supersedesId: string | null;
            createdBy: string;
            approvedBy: string | null;
            createdAt: Date;
        }[];
        meta: object;
    }>;
    conflicts: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: import("@/lib/mapping-conflicts").MappingConflict[];
        meta: object;
    }>;
    counts: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            search?: string | undefined;
        };
        output: {
            active: number;
            suggested: number;
            deprecated: number;
            rejected: number;
        };
        meta: object;
    }>;
    history: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            mappingId: string;
        };
        output: {
            id: string;
            version: number;
            targetValue: string;
            targetSystem: string | null;
            status: "active" | "deprecated" | "rejected" | "suggested";
            supersedesId: string | null;
            supersededById: string | null;
            createdBy: string;
            approvedBy: string | null;
            createdAt: Date;
        }[];
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            scope?: "source_system" | "workspace" | undefined;
            sourceSystem?: string | null | undefined;
            type: "authority_to_system" | "code_to_code" | "custom" | "facility_to_org";
            sourceValue: string;
            targetValue: string;
            targetSystem?: string | null | undefined;
        };
        output: {
            id: string;
        };
        meta: object;
    }>;
    update: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            mappingId: string;
            targetValue: string;
            targetSystem?: string | null | undefined;
        };
        output: {
            id: string;
            version: number;
        };
        meta: object;
    }>;
    approve: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            mappingId: string;
        };
        output: {
            approved: boolean;
        };
        meta: object;
    }>;
    reject: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            mappingId: string;
        };
        output: {
            rejected: boolean;
        };
        meta: object;
    }>;
    deprecate: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            mappingId: string;
        };
        output: {
            deprecated: boolean;
        };
        meta: object;
    }>;
    reactivate: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            mappingId: string;
        };
        output: {
            reactivated: boolean;
        };
        meta: object;
    }>;
    exportRows: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            status?: "active" | "deprecated" | "rejected" | "suggested" | undefined;
            type?: "authority_to_system" | "code_to_code" | "custom" | "facility_to_org" | undefined;
        };
        output: {
            type: "authority_to_system" | "code_to_code" | "custom" | "facility_to_org";
            sourceValue: string;
            targetValue: string;
            targetSystem: string | null;
            scope: "source_system" | "workspace";
            sourceSystem: string | null;
        }[];
        meta: object;
    }>;
    importRows: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            rows: {
                scope?: "source_system" | "workspace" | undefined;
                sourceSystem?: string | null | undefined;
                type: "authority_to_system" | "code_to_code" | "custom" | "facility_to_org";
                sourceValue: string;
                targetValue: string;
                targetSystem?: string | null | undefined;
            }[];
        };
        output: {
            imported: number;
            skipped: string[];
        };
        meta: object;
    }>;
}>>;
