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
                planTier: "free" | "premium" | "team";
                createdAt: Date;
                updatedAt: Date;
            } | null;
            runs: {
                id: string;
                workspaceId: string;
                actorType: "api_key" | "scheduled" | "system" | "user";
                actorId: string | null;
                source: "api" | "ci" | "scheduled" | "ui";
                inputType: "bundle" | "fhir_json" | "fhir_xml" | "hl7v2" | "ndjson" | "zip";
                fhirVersion: "R4" | "R4B" | "R5" | null;
                profilesRequested: string[];
                profilesApplied: string[];
                terminologyServer: string | null;
                engineVersion: string;
                igVersions: Record<string, string>;
                status: "completed" | "failed" | "queued" | "running";
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
                severity: "error" | "info" | "warning";
                category: "cardinality" | "invariant" | "must_support" | "profile" | "reference" | "structural" | "terminology";
                ruleSource: string;
                specCitation: string;
                resourceType: string | null;
                fhirpath: string | null;
                rawValidatorMessage: string;
                plainMessage: string;
                suggestedFix: string;
                fixConfidence: "auto" | "manual" | "one_click";
                fixStatus: "applied" | "dismissed" | "manual_needed" | "skipped" | "suggested";
                dismissedBy: string | null;
                dedupFingerprint: string;
                occurrenceCount: number;
                rank: number;
                createdAt: Date;
            }[];
            mappings: {
                id: string;
                workspaceId: string;
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
                supersededById: string | null;
                createdBy: string;
                approvedBy: string | null;
                createdAt: Date;
            }[];
            ledger: {
                id: string;
                workspaceId: string;
                type: "adjustment" | "debit" | "expiry" | "grant" | "purchase" | "refund";
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
                actorType: "api_key" | "system" | "user";
                actorId: string | null;
                action: "baa.requested" | "billing.auto_recharge_changed" | "billing.checkout_started" | "billing.spend_cap_changed" | "check.changed" | "check.created" | "check.deleted" | "data.exported" | "key.created" | "key.revoked" | "login" | "mapping.approved" | "mapping.changed" | "mapping.deprecated" | "mapping.imported" | "member.invited" | "member.removed" | "member.role_changed" | "packet.exported" | "packet.launched" | "report.downloaded" | "report.exported" | "run.cancelled" | "run.created" | "settings.changed" | "sso.configured" | "sso.removed" | "webhook.created" | "webhook.deleted" | "webhook.secret_rotated" | "workspace.deleted";
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
            }[];
            artifacts: {
                key: string;
                kind: "corrected" | "evidence" | "export" | "input" | "signed_pdf";
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
            enabled: false;
            provider: null;
        } | {
            enabled: true;
            provider: null;
        } | {
            enabled: true;
            provider: {
                providerId: string;
                issuer: string;
                domain: string;
                entryPoint: string | null;
                certFingerprint: string | null;
            };
        };
        meta: object;
    }>;
    ssoUpsert: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
            domain: string;
            metadataUrl?: string | undefined;
            issuer?: string | undefined;
            entryPoint?: string | undefined;
            cert?: string | undefined;
        };
        output: {
            providerId: string;
            issuer: string;
        };
        meta: object;
    }>;
    ssoDelete: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            workspaceId: string;
        };
        output: {
            removed: boolean;
        };
        meta: object;
    }>;
}>>;
