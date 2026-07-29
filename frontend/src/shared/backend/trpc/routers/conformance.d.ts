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
            status: "cancelled" | "completed" | "failed" | "queued" | "running";
            testKits: string[];
            targetEndpoint: string;
            overallResult: "fail" | "partial" | "pass" | null;
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
            id: string;
            workspaceId: string;
            actorId: string;
            testKits: string[];
            igVersions: Record<string, string>;
            infernoVersion: string;
            targetEndpoint: string;
            status: "cancelled" | "completed" | "failed" | "queued" | "running";
            resultsMatrix: schema.StoredMatrixCell[] | null;
            progress: Record<string, {
                total: number;
                completed: number;
                status: string;
            }>;
            overallResult: "fail" | "partial" | "pass" | null;
            passCount: number | null;
            failCount: number | null;
            previousRunId: string | null;
            errorMessage: string | null;
            startedAt: Date | null;
            completedAt: Date | null;
            createdAt: Date;
            summary: import("@shared/engine").MatrixSummary | null;
            evidence: {
                id: string;
                sha256: string;
                sizeBytes: number;
                createdAt: Date;
            } | null;
            regressions: import("@shared/engine").RegressionEntry[];
        };
        meta: object;
    }>;
    launch: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            testKits: string[];
            targetEndpoint: string;
            auth?: {
                auth_type: "asymmetric" | "backend_services" | "public" | "symmetric";
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
