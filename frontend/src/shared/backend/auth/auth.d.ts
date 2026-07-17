export declare const auth: import("better-auth").Auth<{
    appName: string;
    baseURL: string;
    secret: string;
    trustedOrigins: string[];
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    user: {
        additionalFields: {
            notificationPrefs: {
                type: "string";
                required: false;
                input: true;
            };
        };
    };
    emailAndPassword: {
        enabled: true;
        requireEmailVerification: true;
        sendResetPassword: ({ user, url }: {
            user: import("better-auth").User;
            url: string;
            token: string;
        }) => Promise<void>;
    };
    emailVerification: {
        sendOnSignUp: true;
        autoSignInAfterVerification: true;
        sendVerificationEmail: ({ user, url }: {
            user: import("better-auth").User;
            url: string;
            token: string;
        }) => Promise<void>;
    };
    advanced: {
        defaultCookieAttributes: {
            sameSite: "none" | "lax";
            secure: boolean;
        };
    };
    plugins: [import("better-auth/plugins").DefaultOrganizationPlugin<{
        ac: {
            newRole<const TRoleStatements extends import("better-auth/plugins").Statements>(statements: import("better-auth/plugins").RoleInput<{
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }, TRoleStatements>): import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<TRoleStatements>, {
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }>;
            statements: {
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            };
        };
        roles: {
            owner: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly workspaceSettings: ["view", "update"];
                readonly billing: ["view", "manage"];
                readonly run: ["create", "view"];
                readonly mapping: ["view", "create", "approve", "deprecate"];
                readonly apiKey: ["view", "create", "revoke"];
                readonly audit: ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }>, {
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }>;
            admin: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly workspaceSettings: ["view", "update"];
                readonly billing: ["view", "manage"];
                readonly run: ["create", "view"];
                readonly mapping: ["view", "create", "approve", "deprecate"];
                readonly apiKey: ["view", "create", "revoke"];
                readonly audit: ["view"];
                readonly organization: readonly ["update"];
                readonly invitation: readonly ["create", "cancel"];
                readonly member: readonly ["create", "update", "delete"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }>, {
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }>;
            member: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly workspaceSettings: ["view"];
                readonly billing: ["view"];
                readonly run: ["create", "view"];
                readonly mapping: ["view", "create", "approve", "deprecate"];
                readonly apiKey: ["view", "create", "revoke"];
                readonly audit: ["view"];
            }>, {
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }>;
            billing: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly workspaceSettings: ["view"];
                readonly billing: ["view", "manage"];
                readonly run: ["create", "view"];
                readonly mapping: ["view"];
                readonly apiKey: ["view"];
            }>, {
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }>;
            auditor: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly workspaceSettings: ["view"];
                readonly billing: ["view"];
                readonly run: ["view"];
                readonly mapping: ["view"];
                readonly apiKey: ["view"];
                readonly audit: ["view"];
            }>, {
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
            }>;
        };
        sendInvitationEmail: ({ email, invitation, organization: org }: {
            id: string;
            role: string;
            email: string;
            organization: import("better-auth/plugins").Organization;
            invitation: import("better-auth/plugins").Invitation;
            inviter: import("better-auth/plugins").Member & {
                user: import("better-auth").User;
            };
        }) => Promise<void>;
    }>, {
        id: "magic-link";
        version: string;
        endpoints: {
            signInMagicLink: import("better-auth").StrictEndpoint<"/sign-in/magic-link", {
                method: "POST";
                requireHeaders: true;
                body: import("zod").ZodObject<{
                    email: import("zod").ZodEmail;
                    name: import("zod").ZodOptional<import("zod").ZodString>;
                    callbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                    newUserCallbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                    errorCallbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                    metadata: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                status: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                status: boolean;
            }>;
            magicLinkVerify: import("better-auth").StrictEndpoint<"/magic-link/verify", {
                method: "GET";
                query: import("zod").ZodObject<{
                    token: import("zod").ZodString;
                    callbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                    errorCallbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                    newUserCallbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<void>)[];
                requireHeaders: true;
                metadata: {
                    openapi: {
                        operationId: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                session: {
                                                    $ref: string;
                                                };
                                                user: {
                                                    $ref: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                token: string;
                user: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                };
                session: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    expiresAt: Date;
                    token: string;
                    ipAddress?: string | null | undefined;
                    userAgent?: string | null | undefined;
                };
            }>;
        };
        rateLimit: {
            pathMatcher(path: string): boolean;
            window: number;
            max: number;
        }[];
        options: import("better-auth/plugins").MagicLinkOptions;
    }];
}>;
export type Auth = typeof auth;
