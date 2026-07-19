export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
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
    meta: import("@trpc/server").TRPCBuiltRouter<{
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
        health: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                ok: true;
                service: string;
            };
            meta: object;
        }>;
    }>>;
    account: import("@trpc/server").TRPCBuiltRouter<{
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
        get: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: {
                id: string;
                name: string;
                email: string;
                image: string | null | undefined;
                emailVerified: boolean;
                notificationPrefs: {
                    runComplete: boolean;
                    driftAlerts: boolean;
                    lowBalance: boolean;
                    productUpdates: boolean;
                };
            };
            meta: object;
        }>;
        updateProfile: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                name?: string | undefined;
                image?: string | null | undefined;
            };
            output: {
                ok: boolean;
            };
            meta: object;
        }>;
        changePassword: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                currentPassword: string;
                newPassword: string;
                revokeOtherSessions?: boolean | undefined;
            };
            output: {
                ok: boolean;
            };
            meta: object;
        }>;
        notificationPrefs: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                runComplete?: boolean | undefined;
                driftAlerts?: boolean | undefined;
                lowBalance?: boolean | undefined;
                productUpdates?: boolean | undefined;
            };
            output: {
                runComplete: boolean;
                driftAlerts: boolean;
                lowBalance: boolean;
                productUpdates: boolean;
            };
            meta: object;
        }>;
    }>>;
    workspace: import("@trpc/server").TRPCBuiltRouter<{
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
    member: import("@trpc/server").TRPCBuiltRouter<{
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
            };
            output: {
                members: ({
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
                role?: "admin" | "auditor" | "billing" | "member" | "owner" | undefined;
            };
            output: {
                id: string;
                organizationId: string;
                email: string;
                role: "admin" | "auditor" | "billing" | "member" | "owner";
                status: import("better-auth/plugins").InvitationStatus;
                inviterId: string;
                expiresAt: Date;
                createdAt: Date;
            } | {
                id: string;
                organizationId: string;
                email: string;
                role: "admin" | "auditor" | "billing" | "member" | "owner";
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
                role: "admin" | "auditor" | "billing" | "member" | "owner";
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
                    role: "admin" | "auditor" | "billing" | "member" | "owner";
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
    run: import("@trpc/server").TRPCBuiltRouter<{
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
                };
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
    mappings: import("@trpc/server").TRPCBuiltRouter<{
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
        counts: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
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
    billing: import("@trpc/server").TRPCBuiltRouter<{
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
        summary: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
            };
            output: {
                balanceDollars: number;
                resourcesRemaining: number;
                dailyBurnDollars: number;
                estimatedMonthlyDollars: number;
                daysRemaining: number | null;
                isTrial: boolean;
                billingConfigured: boolean;
                autoRecharge: {
                    enabled: boolean;
                    thresholdDollars: number | null;
                    amountCents: number | null;
                    blockedByCap: boolean;
                };
                spendCap: {
                    monthlyCents: number | null;
                    spentThisCycleCents: number;
                };
                packs: {
                    id: "pack_10" | "pack_100" | "pack_25";
                    label: "$10" | "$100" | "$25";
                    cents: 1000 | 2500 | 10000;
                }[];
            };
            meta: object;
        }>;
        usage: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
                days?: number | undefined;
            };
            output: {
                day: string;
                source: string;
                dollars: number;
            }[];
            meta: object;
        }>;
        ledger: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
                limit?: number | undefined;
                offset?: number | undefined;
            };
            output: {
                id: string;
                type: "adjustment" | "debit" | "expiry" | "grant" | "purchase" | "refund";
                amountMicro: number;
                balanceAfter: number;
                description: string;
                relatedRunId: string | null;
                createdAt: Date;
                amountDollars: number;
                balanceAfterDollars: number;
            }[];
            meta: object;
        }>;
        invoices: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                workspaceId: string;
            };
            output: {
                id: string;
                amountCents: number;
                creditsPurchasedMicro: number;
                status: "draft" | "open" | "paid" | "void";
                issuedAt: Date;
                paidAt: Date | null;
            }[];
            meta: object;
        }>;
        checkout: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                packId: string;
            };
            output: {
                url: string;
            };
            meta: object;
        }>;
        setAutoRecharge: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                enabled: boolean;
                thresholdDollars?: number | undefined;
                amountCents?: number | undefined;
            };
            output: {
                enabled: boolean;
            };
            meta: object;
        }>;
        setSpendCap: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                workspaceId: string;
                monthlyCents: number | null;
            };
            output: {
                monthlyCents: number | null;
            };
            meta: object;
        }>;
    }>>;
    developers: import("@trpc/server").TRPCBuiltRouter<{
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
        apiKeys: import("@trpc/server").TRPCBuiltRouter<{
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
                };
                output: {
                    id: string;
                    name: string;
                    prefix: string;
                    mode: "live" | "test";
                    scopes: string[];
                    createdAt: Date;
                    lastUsedAt: Date | null;
                    revokedAt: Date | null;
                }[];
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    workspaceId: string;
                    name: string;
                    mode: "live" | "test";
                    scopes?: ("convert" | "fix" | "mappings" | "runs" | "validate")[] | undefined;
                };
                output: {
                    id: string;
                    name: string;
                    mode: "live" | "test";
                    prefix: string;
                    key: string;
                };
                meta: object;
            }>;
            revoke: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    workspaceId: string;
                    keyId: string;
                };
                output: {
                    revoked: boolean;
                };
                meta: object;
            }>;
        }>>;
        webhooks: import("@trpc/server").TRPCBuiltRouter<{
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
                };
                output: {
                    id: string;
                    url: string;
                    events: string[];
                    enabled: boolean;
                    lastDeliveryStatus: string | null;
                    lastDeliveryAt: Date | null;
                    createdAt: Date;
                }[];
                meta: object;
            }>;
            create: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    workspaceId: string;
                    url: string;
                    events: ("batch.completed" | "credits.low" | "run.completed" | "run.failed")[];
                };
                output: {
                    id: string;
                    url: string;
                    events: ("batch.completed" | "credits.low" | "run.completed" | "run.failed")[];
                    secret: string;
                };
                meta: object;
            }>;
            rotateSecret: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    workspaceId: string;
                    id: string;
                };
                output: {
                    secret: string;
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
            delete: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    workspaceId: string;
                    id: string;
                };
                output: {
                    deleted: boolean;
                };
                meta: object;
            }>;
            testPing: import("@trpc/server").TRPCMutationProcedure<{
                input: {
                    workspaceId: string;
                    event?: "batch.completed" | "credits.low" | "run.completed" | "run.failed" | undefined;
                };
                output: {
                    dispatched: boolean;
                    event: import("../../shared/db/webhooks").WebhookEvent;
                };
                meta: object;
            }>;
        }>>;
        requestLogs: import("@trpc/server").TRPCBuiltRouter<{
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
                    method?: string | undefined;
                    statusCode?: number | undefined;
                    onlyErrors?: boolean | undefined;
                    cursor?: string | undefined;
                    limit?: number | undefined;
                };
                output: {
                    logs: {
                        id: string;
                        method: string;
                        path: string;
                        statusCode: number;
                        latencyMs: number;
                        requestBytes: number | null;
                        responseBytes: number | null;
                        idempotencyKey: string | null;
                        runId: string | null;
                        apiKeyId: string | null;
                        errorCode: string | null;
                        ip: string | null;
                        createdAt: Date;
                    }[];
                    nextCursor: string | null;
                    hasMore: boolean;
                };
                meta: object;
            }>;
        }>>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
