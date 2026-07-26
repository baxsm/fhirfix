import { schema } from "@/lib/db";
export declare const monitoringRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    listChecks: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            scheduleLabel: string;
            id: string;
            name: string;
            scheduleCron: string;
            targetType: "endpoint" | "source_url" | "upload_folder";
            targetRef: string;
            profiles: string[];
            registryScope: string | null;
            baselineConfig: {
                minPassRate?: number;
                maxErrorDelta?: number;
            } | null;
            enabled: boolean;
            lastRunId: string | null;
            lastRunAt: Date | null;
            lastError: string | null;
            createdAt: Date;
            channelTypes: string[];
        }[];
        meta: object;
    }>;
    createCheck: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            name: string;
            scheduleCron: string;
            targetType: "endpoint" | "source_url" | "upload_folder";
            targetRef: string;
            profiles?: string[] | undefined;
            registryScope?: string | null | undefined;
            baselineConfig?: {
                minPassRate?: number | undefined;
                maxErrorDelta?: number | undefined;
            } | null | undefined;
            alertChannels?: {
                type: "email" | "slack" | "webhook";
                target: string;
            }[] | undefined;
            enabled?: boolean | undefined;
        };
        output: {
            id: string;
        };
        meta: object;
    }>;
    updateCheck: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            id: string;
            name: string;
            scheduleCron: string;
            targetType: "endpoint" | "source_url" | "upload_folder";
            targetRef: string;
            profiles?: string[] | undefined;
            registryScope?: string | null | undefined;
            baselineConfig?: {
                minPassRate?: number | undefined;
                maxErrorDelta?: number | undefined;
            } | null | undefined;
            alertChannels?: {
                type: "email" | "slack" | "webhook";
                target: string;
            }[] | undefined;
            enabled?: boolean | undefined;
        };
        output: {
            id: string;
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
    deleteCheck: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            id: string;
        };
        output: {
            deleted: boolean;
        };
        meta: object;
    }>;
    runNow: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            id: string;
        };
        output: {
            queued: boolean;
        };
        meta: object;
    }>;
    listAlerts: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            scheduledCheckId?: string | undefined;
            type?: "pass_rate_drop" | "new_error_class" | "unmapped_authority" | "ig_version_change" | undefined;
            unacknowledgedOnly?: boolean | undefined;
        };
        output: {
            id: string;
            scheduledCheckId: string;
            checkName: string | null;
            runId: string | null;
            type: "pass_rate_drop" | "new_error_class" | "unmapped_authority" | "ig_version_change";
            severity: "error" | "warning" | "info";
            metricBefore: string | null;
            metricAfter: string | null;
            detail: string | null;
            acknowledgedBy: string | null;
            acknowledgedAt: Date | null;
            createdAt: Date;
        }[];
        meta: object;
    }>;
    alertCounts: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            total: number;
            open: number;
            error: number;
            warning: number;
            info: number;
        };
        meta: object;
    }>;
    acknowledgeAlert: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            id: string;
        };
        output: {
            acknowledged: boolean;
        };
        meta: object;
    }>;
}>>;
