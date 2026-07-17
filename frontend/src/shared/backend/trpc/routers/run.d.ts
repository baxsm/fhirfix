import { schema } from "@/lib/db";
declare const SHARE_TTL_DAYS = 30;
export declare const runRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    submit: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            content: string;
            profiles?: string[] | undefined;
            autoFix?: boolean | undefined;
        };
        output: {
            runId: string;
            status: "queued";
        };
        meta: object;
    }>;
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            runId: string;
        };
        output: {
            run: {
                id: string;
                workspaceId: string;
                actorType: "user" | "api_key" | "scheduled" | "system";
                actorId: string | null;
                source: "scheduled" | "ui" | "api" | "ci";
                inputType: "hl7v2" | "fhir_json" | "fhir_xml" | "ndjson" | "bundle" | "zip";
                fhirVersion: "R4" | "R4B" | "R5" | null;
                profilesApplied: string[];
                terminologyServer: string | null;
                engineVersion: string;
                igVersions: Record<string, string>;
                status: "queued" | "running" | "completed" | "failed";
                resourceCount: number;
                conformanceScoreBefore: number | null;
                conformanceScoreAfter: number | null;
                autoFixApplied: boolean;
                findingsTotal: number;
                findingsAutoFixable: number;
                creditsCharged: number;
                idempotencyKey: string | null;
                requestHash: string | null;
                attempts: number;
                inputRef: string | null;
                correctedRef: string | null;
                retentionExpiresAt: Date | null;
                errorMessage: string | null;
                createdAt: Date;
                completedAt: Date | null;
            };
            findings: {
                id: string;
                runId: string;
                workspaceId: string;
                severity: "error" | "warning" | "info";
                category: "structural" | "profile" | "terminology" | "cardinality" | "invariant" | "reference" | "must_support";
                ruleSource: string;
                specCitation: string;
                resourceType: string | null;
                fhirpath: string | null;
                rawValidatorMessage: string;
                plainMessage: string;
                suggestedFix: string;
                fixConfidence: "auto" | "one_click" | "manual";
                fixStatus: "applied" | "suggested" | "skipped" | "manual_needed" | "dismissed";
                dismissedBy: string | null;
                dedupFingerprint: string;
                occurrenceCount: number;
                rank: number;
                createdAt: Date;
            }[];
            corrected: string | null;
            input: string | null;
            share: {
                token: string;
                redacted: boolean;
                expiresAt: Date | null;
                revokedAt: Date | null;
            } | null;
        };
        meta: object;
    }>;
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            id: string;
            workspaceId: string;
            actorType: "user" | "api_key" | "scheduled" | "system";
            actorId: string | null;
            source: "scheduled" | "ui" | "api" | "ci";
            inputType: "hl7v2" | "fhir_json" | "fhir_xml" | "ndjson" | "bundle" | "zip";
            fhirVersion: "R4" | "R4B" | "R5" | null;
            profilesApplied: string[];
            terminologyServer: string | null;
            engineVersion: string;
            igVersions: Record<string, string>;
            status: "queued" | "running" | "completed" | "failed";
            resourceCount: number;
            conformanceScoreBefore: number | null;
            conformanceScoreAfter: number | null;
            autoFixApplied: boolean;
            findingsTotal: number;
            findingsAutoFixable: number;
            creditsCharged: number;
            idempotencyKey: string | null;
            requestHash: string | null;
            attempts: number;
            inputRef: string | null;
            correctedRef: string | null;
            retentionExpiresAt: Date | null;
            errorMessage: string | null;
            createdAt: Date;
            completedAt: Date | null;
        }[];
        meta: object;
    }>;
    trend: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            id: string;
            createdAt: Date;
            before: number | null;
            after: number | null;
            findingsTotal: number;
        }[];
        meta: object;
    }>;
    applyFix: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            runId: string;
            fingerprints: string[];
        };
        output: {
            status: "running";
        };
        meta: object;
    }>;
    fixWithAi: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            runId: string;
            fingerprint: string;
        };
        output: {
            status: "running";
        };
        meta: object;
    }>;
    dismissFinding: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            runId: string;
            findingId: string;
        };
        output: {
            dismissed: boolean;
        };
        meta: object;
    }>;
    cancel: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            runId: string;
        };
        output: {
            cancelled: false;
            status: "completed" | "failed";
        } | {
            cancelled: true;
            status: "failed";
        };
        meta: object;
    }>;
    share: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            runId: string;
            redact?: boolean | undefined;
            expiresInDays?: number | undefined;
        };
        output: {
            token: string;
            redacted: boolean;
            expiresAt: Date;
        };
        meta: object;
    }>;
    revokeShare: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            token: string;
        };
        output: {
            revoked: boolean;
        };
        meta: object;
    }>;
}>>;
export { SHARE_TTL_DAYS };
