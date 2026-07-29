import { schema } from "@/lib/db";
export declare const conformanceRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    kits: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            id: import("@shared/engine").TestKitId;
            label: string;
            igIdentifier: string;
            igVersion: string;
            kitVersion: string;
            attended: boolean;
            attendedReason: string | null;
        }[];
        meta: object;
    }>;
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            id: string;
            status: "queued" | "running" | "completed" | "failed" | "cancelled";
            testKits: string[];
            targetEndpoint: string;
            overallResult: "pass" | "fail" | "partial" | null;
            passCount: number | null;
            failCount: number | null;
            igVersions: Record<string, string>;
            infernoVersion: string;
            errorMessage: string | null;
            startedAt: Date | null;
            completedAt: Date | null;
            createdAt: Date;
        }[];
        meta: object;
    }>;
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            packetRunId: string;
        };
        output: {
            summary: import("@shared/engine").MatrixSummary | null;
            evidence: {
                id: string;
                sha256: string;
                sizeBytes: number;
                createdAt: Date;
            } | null;
            regressions: import("@shared/engine").RegressionEntry[];
            id: string;
            workspaceId: string;
            actorId: string;
            testKits: string[];
            igVersions: Record<string, string>;
            infernoVersion: string;
            targetEndpoint: string;
            status: "queued" | "running" | "completed" | "failed" | "cancelled";
            resultsMatrix: schema.StoredMatrixCell[] | null;
            progress: Record<string, {
                total: number;
                completed: number;
                status: string;
            }>;
            overallResult: "pass" | "fail" | "partial" | null;
            passCount: number | null;
            failCount: number | null;
            previousRunId: string | null;
            errorMessage: string | null;
            startedAt: Date | null;
            completedAt: Date | null;
            createdAt: Date;
        };
        meta: object;
    }>;
    launch: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            testKits: string[];
            targetEndpoint: string;
            auth?: {
                auth_type: "backend_services" | "public" | "symmetric" | "asymmetric";
                token_url?: string | undefined;
                requested_scopes?: string | undefined;
                client_id?: string | undefined;
                client_secret?: string | undefined;
                access_token?: string | undefined;
            } | undefined;
            previousRunId?: string | undefined;
        };
        output: {
            packetRunId: string;
        };
        meta: object;
    }>;
    exportEvidence: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            packetRunId: string;
        };
        output: {
            content: string;
            sha256: string;
        };
        meta: object;
    }>;
}>>;
