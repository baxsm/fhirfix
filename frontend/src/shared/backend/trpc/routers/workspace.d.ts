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
        input: void;
        output: {
            id: string;
            name: string;
            slug: string;
            createdAt: Date;
            logo?: string | null | undefined | undefined;
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
            logo?: string | null | undefined | undefined;
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
                    role: "member" | "billing" | "owner" | "admin" | "auditor";
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
                    role: "member" | "billing" | "owner" | "admin" | "auditor";
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
                logo?: string | null | undefined | undefined;
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
                planTier: "free" | "team" | "premium";
                createdAt: Date;
                updatedAt: Date;
            } | null;
            role: "member" | "billing" | "owner" | "admin" | "auditor";
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
            planTier: "free" | "team" | "premium";
            createdAt: Date;
            updatedAt: Date;
        };
        meta: object;
    }>;
    exportData: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            exportedAt: string;
            workspaceId: string;
            settings: {
                id: string;
                workspaceId: string;
                defaultProfiles: string[];
                defaultTerminologyServer: string | null;
                redactionPolicy: "off" | "on_ingest" | "required";
                dataRetentionDays: number;
                baaStatus: "none" | "requested" | "signed";
                planTier: "free" | "team" | "premium";
                createdAt: Date;
                updatedAt: Date;
            } | null;
            runs: {
                id: string;
                workspaceId: string;
                actorType: "user" | "api_key" | "scheduled" | "system";
                actorId: string | null;
                source: "scheduled" | "ui" | "api" | "ci";
                inputType: "hl7v2" | "fhir_json" | "fhir_xml" | "ndjson" | "bundle" | "zip";
                fhirVersion: "R4" | "R4B" | "R5" | null;
                profilesRequested: string[];
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
            mappings: {
                id: string;
                workspaceId: string;
                scope: "workspace" | "source_system";
                sourceSystem: string | null;
                type: "custom" | "authority_to_system" | "code_to_code" | "facility_to_org";
                sourceValue: string;
                targetValue: string;
                targetSystem: string | null;
                status: "suggested" | "active" | "deprecated" | "rejected";
                confidence: number | null;
                version: number;
                supersedesId: string | null;
                supersededById: string | null;
                createdBy: string;
                approvedBy: string | null;
                createdAt: Date;
            }[];
            ledger: {
                id: string;
                workspaceId: string;
                type: "purchase" | "debit" | "grant" | "refund" | "expiry" | "adjustment";
                amountMicroCredits: number;
                balanceAfter: number;
                relatedRunId: string | null;
                relatedInvoiceId: string | null;
                description: string;
                createdBy: string;
                createdAt: Date;
            }[];
            invoices: {
                id: string;
                workspaceId: string;
                amountCents: number;
                creditsPurchasedMicro: number;
                status: "draft" | "open" | "paid" | "void";
                polarOrderId: string | null;
                issuedAt: Date;
                paidAt: Date | null;
            }[];
            audit: {
                id: string;
                workspaceId: string;
                actorType: "user" | "api_key" | "system";
                actorId: string | null;
                action: "login" | "run.created" | "run.cancelled" | "report.downloaded" | "report.exported" | "mapping.changed" | "mapping.approved" | "mapping.deprecated" | "mapping.imported" | "key.created" | "key.revoked" | "webhook.created" | "webhook.secret_rotated" | "webhook.deleted" | "member.invited" | "member.role_changed" | "member.removed" | "settings.changed" | "billing.checkout_started" | "billing.auto_recharge_changed" | "billing.spend_cap_changed" | "check.created" | "check.changed" | "check.deleted" | "packet.launched" | "packet.exported" | "data.exported" | "baa.requested" | "workspace.deleted";
                targetRef: string | null;
                ip: string | null;
                metadata: Record<string, unknown> | null;
                createdAt: Date;
            }[];
            scheduledChecks: {
                id: string;
                workspaceId: string;
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
                alertChannels: {
                    type: "email" | "slack" | "webhook";
                    target: string;
                }[];
                enabled: boolean;
                lastRunId: string | null;
                lastRunAt: Date | null;
                lastError: string | null;
                createdBy: string;
                createdAt: Date;
            }[];
            conformancePackets: {
                id: string;
                workspaceId: string;
                actorId: string;
                testKits: string[];
                igVersions: Record<string, string>;
                infernoVersion: string;
                targetEndpoint: string;
                authConfigRef: string | null;
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
            }[];
            artifacts: {
                key: string;
                kind: "input" | "corrected" | "evidence" | "signed_pdf" | "export";
                sizeBytes: number;
                sha256: string;
                containsPhi: boolean;
                createdAt: Date;
                deletedAt: Date | null;
            }[];
        };
        meta: object;
    }>;
    delete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            confirmSlug: string;
        };
        output: import("@shared/db/gdpr").DeletionSummary;
        meta: object;
    }>;
    requestBaa: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            baaStatus: "none" | "requested" | "signed";
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
