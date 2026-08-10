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
    socialProviders: {
        google: {
            clientId: string;
            clientSecret: string;
        };
    } | {
        google?: undefined;
    };
    account: {
        accountLinking: {
            enabled: true;
            trustedProviders: "google"[];
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
    databaseHooks: {
        session: {
            create: {
                after: (session: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    expiresAt: Date;
                    token: string;
                    ipAddress?: string | null | undefined;
                    userAgent?: string | null | undefined;
                } & Record<string, unknown>) => Promise<void>;
            };
        };
    };
    advanced: {
        defaultCookieAttributes: {
            sameSite: "lax" | "none";
            secure: boolean;
        };
    };
    plugins: [import("better-auth/plugins").DefaultOrganizationPlugin<{
        ac: {
            newRole<const TRoleStatements extends import("better-auth/plugins").Statements>(statements: import("better-auth/plugins").RoleInput<{
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly monitoring: readonly ["view", "manage"];
            }, TRoleStatements>): import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<TRoleStatements>, {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly monitoring: readonly ["view", "manage"];
            }>;
            statements: {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly monitoring: readonly ["view", "manage"];
            };
        };
        roles: {
            owner: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: ["view", "update"];
                readonly billing: ["view", "manage"];
                readonly run: ["create", "view"];
                readonly mapping: ["view", "create", "approve", "deprecate"];
                readonly apiKey: ["view", "create", "revoke"];
                readonly audit: ["view"];
                readonly monitoring: ["view", "manage"];
            }>, {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly monitoring: readonly ["view", "manage"];
            }>;
            admin: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly organization: readonly ["update"];
                readonly invitation: readonly ["create", "cancel"];
                readonly member: readonly ["create", "update", "delete"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: ["view", "update"];
                readonly billing: ["view", "manage"];
                readonly run: ["create", "view"];
                readonly mapping: ["view", "create", "approve", "deprecate"];
                readonly apiKey: ["view", "create", "revoke"];
                readonly audit: ["view"];
                readonly monitoring: ["view", "manage"];
            }>, {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly monitoring: readonly ["view", "manage"];
            }>;
            member: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly workspaceSettings: ["view"];
                readonly billing: ["view"];
                readonly run: ["create", "view"];
                readonly mapping: ["view", "create", "approve", "deprecate"];
                readonly apiKey: ["view", "create", "revoke"];
                readonly audit: ["view"];
                readonly monitoring: ["view", "manage"];
            }>, {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly monitoring: readonly ["view", "manage"];
            }>;
            billing: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly workspaceSettings: ["view"];
                readonly billing: ["view", "manage"];
                readonly run: ["create", "view"];
                readonly mapping: ["view"];
                readonly apiKey: ["view"];
                readonly monitoring: ["view"];
            }>, {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly monitoring: readonly ["view", "manage"];
            }>;
            auditor: import("better-auth/plugins").Role<import("better-auth/plugins").ExactRoleStatements<{
                readonly workspaceSettings: ["view"];
                readonly billing: ["view"];
                readonly run: ["view"];
                readonly mapping: ["view"];
                readonly apiKey: ["view"];
                readonly audit: ["view"];
                readonly monitoring: ["view"];
            }>, {
                readonly organization: readonly ["update", "delete"];
                readonly member: readonly ["create", "update", "delete"];
                readonly invitation: readonly ["create", "cancel"];
                readonly team: readonly ["create", "update", "delete"];
                readonly ac: readonly ["create", "read", "update", "delete"];
                readonly workspaceSettings: readonly ["view", "update"];
                readonly billing: readonly ["view", "manage"];
                readonly run: readonly ["create", "view"];
                readonly mapping: readonly ["view", "create", "approve", "deprecate"];
                readonly apiKey: readonly ["view", "create", "revoke"];
                readonly audit: readonly ["view"];
                readonly monitoring: readonly ["view", "manage"];
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
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<void>)[];
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
    }, ...({
        id: "admin";
        version: string;
        init(): {
            options: {
                databaseHooks: {
                    user: {
                        create: {
                            before(user: {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                email: string;
                                emailVerified: boolean;
                                name: string;
                                image?: string | null | undefined;
                            } & Record<string, unknown>): Promise<{
                                data: {
                                    id: string;
                                    createdAt: Date;
                                    updatedAt: Date;
                                    email: string;
                                    emailVerified: boolean;
                                    name: string;
                                    image?: string | null | undefined;
                                    role: string;
                                };
                            }>;
                        };
                    };
                    session: {
                        create: {
                            before(session: {
                                id: string;
                                createdAt: Date;
                                updatedAt: Date;
                                userId: string;
                                expiresAt: Date;
                                token: string;
                                ipAddress?: string | null | undefined;
                                userAgent?: string | null | undefined;
                            } & Record<string, unknown>, ctx: import("better-auth").GenericEndpointContext | null): Promise<void>;
                        };
                    };
                };
            };
        };
        hooks: {
            after: {
                matcher(context: import("better-auth").HookEndpointContext): boolean;
                handler: (inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<import("better-auth/plugins").SessionWithImpersonatedBy[] | undefined>;
            }[];
        };
        endpoints: {
            setRole: import("better-auth").StrictEndpoint<"/admin/set-role", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                    role: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>;
                }, import("zod/v4/core").$strip>;
                requireHeaders: true;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
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
                    $Infer: {
                        body: {
                            userId: string;
                            role: "admin" | "user" | ("admin" | "user")[];
                        };
                    };
                };
            }, {
                user: import("better-auth/plugins").UserWithRole;
            }>;
            getUser: import("better-auth").StrictEndpoint<"/admin/get-user", {
                method: "GET";
                query: import("zod").ZodObject<{
                    id: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
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
            }, import("better-auth/plugins").UserWithRole>;
            createUser: import("better-auth").StrictEndpoint<"/admin/create-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    email: import("zod").ZodString;
                    password: import("zod").ZodOptional<import("zod").ZodString>;
                    name: import("zod").ZodString;
                    role: import("zod").ZodOptional<import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>]>>;
                    data: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
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
                    $Infer: {
                        body: {
                            email: string;
                            password?: string | undefined;
                            name: string;
                            role?: "admin" | "user" | ("admin" | "user")[] | undefined;
                            data?: Record<string, any> | undefined;
                        };
                    };
                };
            }, {
                user: import("better-auth/plugins").UserWithRole;
            }>;
            adminUpdateUser: import("better-auth").StrictEndpoint<"/admin/update-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                    data: import("zod").ZodRecord<import("zod").ZodAny, import("zod").ZodAny>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
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
            }, import("better-auth/plugins").UserWithRole>;
            listUsers: import("better-auth").StrictEndpoint<"/admin/list-users", {
                method: "GET";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                query: import("zod").ZodObject<{
                    searchValue: import("zod").ZodOptional<import("zod").ZodString>;
                    searchField: import("zod").ZodOptional<import("zod").ZodEnum<{
                        email: "email";
                        name: "name";
                    }>>;
                    searchOperator: import("zod").ZodOptional<import("zod").ZodEnum<{
                        contains: "contains";
                        starts_with: "starts_with";
                        ends_with: "ends_with";
                    }>>;
                    limit: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
                    offset: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>>;
                    sortBy: import("zod").ZodOptional<import("zod").ZodString>;
                    sortDirection: import("zod").ZodOptional<import("zod").ZodEnum<{
                        asc: "asc";
                        desc: "desc";
                    }>>;
                    filterField: import("zod").ZodOptional<import("zod").ZodString>;
                    filterValue: import("zod").ZodOptional<import("zod").ZodUnion<[import("zod").ZodUnion<[import("zod").ZodUnion<[import("zod").ZodUnion<[import("zod").ZodString, import("zod").ZodNumber]>, import("zod").ZodBoolean]>, import("zod").ZodArray<import("zod").ZodString>]>, import("zod").ZodArray<import("zod").ZodNumber>]>>;
                    filterOperator: import("zod").ZodOptional<import("zod").ZodEnum<{
                        eq: "eq";
                        ne: "ne";
                        gt: "gt";
                        gte: "gte";
                        lt: "lt";
                        lte: "lte";
                        in: "in";
                        not_in: "not_in";
                        contains: "contains";
                        starts_with: "starts_with";
                        ends_with: "ends_with";
                    }>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                users: {
                                                    type: string;
                                                    items: {
                                                        $ref: string;
                                                    };
                                                };
                                                total: {
                                                    type: string;
                                                };
                                                limit: {
                                                    type: string;
                                                };
                                                offset: {
                                                    type: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                users: import("better-auth/plugins").UserWithRole[];
                total: number;
            }>;
            listUserSessions: import("better-auth").StrictEndpoint<"/admin/list-user-sessions", {
                method: "POST";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                sessions: {
                                                    type: string;
                                                    items: {
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
                };
            }, {
                sessions: import("better-auth/plugins").SessionWithImpersonatedBy[];
            }>;
            unbanUser: import("better-auth").StrictEndpoint<"/admin/unban-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
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
                user: import("better-auth/plugins").UserWithRole;
            }>;
            banUser: import("better-auth").StrictEndpoint<"/admin/ban-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                    banReason: import("zod").ZodOptional<import("zod").ZodString>;
                    banExpiresIn: import("zod").ZodOptional<import("zod").ZodNumber>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
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
                user: import("better-auth/plugins").UserWithRole;
            }>;
            impersonateUser: import("better-auth").StrictEndpoint<"/admin/impersonate-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
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
                user: import("better-auth/plugins").UserWithRole;
            }>;
            stopImpersonating: import("better-auth").StrictEndpoint<"/admin/stop-impersonating", {
                method: "POST";
                requireHeaders: true;
            }, {
                session: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    userId: string;
                    expiresAt: Date;
                    token: string;
                    ipAddress?: string | null | undefined;
                    userAgent?: string | null | undefined;
                } & Record<string, any>;
                user: {
                    id: string;
                    createdAt: Date;
                    updatedAt: Date;
                    email: string;
                    emailVerified: boolean;
                    name: string;
                    image?: string | null | undefined;
                } & Record<string, any>;
            }>;
            revokeUserSession: import("better-auth").StrictEndpoint<"/admin/revoke-user-session", {
                method: "POST";
                body: import("zod").ZodObject<{
                    sessionToken: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                success: {
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
                success: boolean;
            }>;
            revokeUserSessions: import("better-auth").StrictEndpoint<"/admin/revoke-user-sessions", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                success: {
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
                success: boolean;
            }>;
            removeUser: import("better-auth").StrictEndpoint<"/admin/remove-user", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            200: {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                success: {
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
                success: boolean;
            }>;
            setUserPassword: import("better-auth").StrictEndpoint<"/admin/set-user-password", {
                method: "POST";
                body: import("zod").ZodObject<{
                    newPassword: import("zod").ZodString;
                    userId: import("zod").ZodCoercedString<unknown>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        user: import("better-auth/plugins").UserWithRole;
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
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
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
            userHasPermission: import("better-auth").StrictEndpoint<"/admin/has-permission", {
                method: "POST";
                body: import("zod").ZodIntersection<import("zod").ZodObject<{
                    userId: import("zod").ZodOptional<import("zod").ZodCoercedString<unknown>>;
                    role: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>, import("zod").ZodXor<readonly [import("zod").ZodObject<{
                    permission: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>, import("zod").ZodObject<{
                    permissions: import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodArray<import("zod").ZodString>>;
                }, import("zod/v4/core").$strip>]>>;
                metadata: {
                    openapi: {
                        description: string;
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object";
                                        properties: {
                                            permissions: {
                                                type: string;
                                                description: string;
                                            };
                                        };
                                        required: string[];
                                    };
                                };
                            };
                        };
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                error: {
                                                    type: string;
                                                };
                                                success: {
                                                    type: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                    $Infer: {
                        body: {
                            permissions: {
                                readonly user?: ("ban" | "create" | "delete" | "get" | "impersonate" | "impersonate-admins" | "list" | "set-email" | "set-password" | "set-role" | "update")[] | undefined;
                                readonly session?: ("delete" | "list" | "revoke")[] | undefined;
                            };
                        } & {
                            userId?: string | undefined;
                            role?: "admin" | "user" | undefined;
                        };
                    };
                };
            }, {
                error: null;
                success: boolean;
            }>;
        };
        $ERROR_CODES: {
            USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: import("better-auth").RawError<"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL">;
            FAILED_TO_CREATE_USER: import("better-auth").RawError<"FAILED_TO_CREATE_USER">;
            USER_ALREADY_EXISTS: import("better-auth").RawError<"USER_ALREADY_EXISTS">;
            YOU_CANNOT_BAN_YOURSELF: import("better-auth").RawError<"YOU_CANNOT_BAN_YOURSELF">;
            YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_CHANGE_USERS_ROLE">;
            YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_CREATE_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_LIST_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_LIST_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_LIST_USERS_SESSIONS">;
            YOU_ARE_NOT_ALLOWED_TO_BAN_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_BAN_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_IMPERSONATE_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_REVOKE_USERS_SESSIONS">;
            YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS">;
            YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_SET_USERS_PASSWORD">;
            BANNED_USER: import("better-auth").RawError<"BANNED_USER">;
            YOU_ARE_NOT_ALLOWED_TO_GET_USER: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_GET_USER">;
            NO_DATA_TO_UPDATE: import("better-auth").RawError<"NO_DATA_TO_UPDATE">;
            YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_UPDATE_USERS">;
            YOU_CANNOT_REMOVE_YOURSELF: import("better-auth").RawError<"YOU_CANNOT_REMOVE_YOURSELF">;
            YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_SET_NON_EXISTENT_VALUE">;
            YOU_CANNOT_IMPERSONATE_ADMINS: import("better-auth").RawError<"YOU_CANNOT_IMPERSONATE_ADMINS">;
            INVALID_ROLE_TYPE: import("better-auth").RawError<"INVALID_ROLE_TYPE">;
            YOU_ARE_NOT_ALLOWED_TO_SET_USERS_EMAIL: import("better-auth").RawError<"YOU_ARE_NOT_ALLOWED_TO_SET_USERS_EMAIL">;
            PASSWORD_CANNOT_BE_UPDATED_VIA_UPDATE_USER: import("better-auth").RawError<"PASSWORD_CANNOT_BE_UPDATED_VIA_UPDATE_USER">;
        };
        schema: {
            user: {
                fields: {
                    role: {
                        type: "string";
                        required: false;
                        input: false;
                    };
                    banned: {
                        type: "boolean";
                        defaultValue: false;
                        required: false;
                        input: false;
                    };
                    banReason: {
                        type: "string";
                        required: false;
                        input: false;
                    };
                    banExpires: {
                        type: "date";
                        required: false;
                        input: false;
                    };
                };
            };
            session: {
                fields: {
                    impersonatedBy: {
                        type: "string";
                        required: false;
                        input: false;
                    };
                };
            };
        };
        options: NoInfer<{
            adminRoles: never[];
        }>;
    } | {
        id: "scim";
        version: string;
        endpoints: {
            generateSCIMToken: import("better-auth").StrictEndpoint<"/scim/generate-token", {
                method: "POST";
                body: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                    organizationId: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "201": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                scimToken: {
                                                    description: string;
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
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
            }, {
                scimToken: string;
            }>;
            listSCIMProviderConnections: import("better-auth").StrictEndpoint<"/scim/list-provider-connections", {
                method: "GET";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                providers: {
                                                    type: string;
                                                    items: {
                                                        type: string;
                                                        properties: {
                                                            id: {
                                                                type: string;
                                                            };
                                                            providerId: {
                                                                type: string;
                                                            };
                                                            organizationId: {
                                                                type: string;
                                                                nullable: boolean;
                                                            };
                                                        };
                                                    };
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
                providers: {
                    id: string;
                    providerId: string;
                    organizationId: string | null;
                }[];
            }>;
            getSCIMProviderConnection: import("better-auth").StrictEndpoint<"/scim/get-provider-connection", {
                method: "GET";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                query: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                id: {
                                                    type: string;
                                                };
                                                providerId: {
                                                    type: string;
                                                };
                                                organizationId: {
                                                    type: string;
                                                    nullable: boolean;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                            };
                            "403": {
                                description: string;
                            };
                        };
                    };
                };
            }, {
                id: string;
                providerId: string;
                organizationId: string | null;
            }>;
            deleteSCIMProviderConnection: import("better-auth").StrictEndpoint<"/scim/delete-provider-connection", {
                method: "POST";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                body: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                success: {
                                                    type: string;
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                            };
                            "403": {
                                description: string;
                            };
                        };
                    };
                };
            }, {
                success: boolean;
            }>;
            getSCIMUser: import("better-auth").StrictEndpoint<"/scim/v2/Users/:userId", {
                method: "GET";
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                };
                                                readonly meta: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly resourceType: {
                                                            readonly type: "string";
                                                        };
                                                        readonly created: {
                                                            readonly type: "string";
                                                            readonly format: "date-time";
                                                        };
                                                        readonly lastModified: {
                                                            readonly type: "string";
                                                            readonly format: "date-time";
                                                        };
                                                        readonly location: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                };
                                                readonly userName: {
                                                    readonly type: "string";
                                                };
                                                readonly name: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly formatted: {
                                                            readonly type: "string";
                                                        };
                                                        readonly givenName: {
                                                            readonly type: "string";
                                                        };
                                                        readonly familyName: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                };
                                                readonly displayName: {
                                                    readonly type: "string";
                                                };
                                                readonly active: {
                                                    readonly type: "boolean";
                                                };
                                                readonly emails: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly value: {
                                                                readonly type: "string";
                                                            };
                                                            readonly primary: {
                                                                readonly type: "boolean";
                                                            };
                                                        };
                                                    };
                                                };
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    authSCIMToken: string;
                    scimProvider: Omit<import("@better-auth/scim").SCIMProvider, "id">;
                }>)[];
            }, {
                id: string;
                externalId: string | undefined;
                meta: {
                    resourceType: string;
                    created: Date;
                    lastModified: Date;
                    location: string;
                };
                userName: string;
                name: {
                    formatted: string;
                };
                displayName: string;
                active: boolean;
                emails: {
                    primary: boolean;
                    value: string;
                }[];
                schemas: string[];
            }>;
            createSCIMUser: import("better-auth").StrictEndpoint<"/scim/v2/Users", {
                method: "POST";
                body: import("zod").ZodObject<{
                    userName: import("zod").ZodString;
                    externalId: import("zod").ZodOptional<import("zod").ZodString>;
                    name: import("zod").ZodOptional<import("zod").ZodObject<{
                        formatted: import("zod").ZodOptional<import("zod").ZodString>;
                        givenName: import("zod").ZodOptional<import("zod").ZodString>;
                        familyName: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>>;
                    emails: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                        value: import("zod").ZodEmail;
                        primary: import("zod").ZodOptional<import("zod").ZodBoolean>;
                    }, import("zod/v4/core").$strip>>>;
                    active: import("zod").ZodOptional<import("zod").ZodBoolean>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "201": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                };
                                                readonly meta: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly resourceType: {
                                                            readonly type: "string";
                                                        };
                                                        readonly created: {
                                                            readonly type: "string";
                                                            readonly format: "date-time";
                                                        };
                                                        readonly lastModified: {
                                                            readonly type: "string";
                                                            readonly format: "date-time";
                                                        };
                                                        readonly location: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                };
                                                readonly userName: {
                                                    readonly type: "string";
                                                };
                                                readonly name: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly formatted: {
                                                            readonly type: "string";
                                                        };
                                                        readonly givenName: {
                                                            readonly type: "string";
                                                        };
                                                        readonly familyName: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                };
                                                readonly displayName: {
                                                    readonly type: "string";
                                                };
                                                readonly active: {
                                                    readonly type: "boolean";
                                                };
                                                readonly emails: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly value: {
                                                                readonly type: "string";
                                                            };
                                                            readonly primary: {
                                                                readonly type: "boolean";
                                                            };
                                                        };
                                                    };
                                                };
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    authSCIMToken: string;
                    scimProvider: Omit<import("@better-auth/scim").SCIMProvider, "id">;
                }>)[];
            }, {
                id: string;
                externalId: string | undefined;
                meta: {
                    resourceType: string;
                    created: Date;
                    lastModified: Date;
                    location: string;
                };
                userName: string;
                name: {
                    formatted: string;
                };
                displayName: string;
                active: boolean;
                emails: {
                    primary: boolean;
                    value: string;
                }[];
                schemas: string[];
            }>;
            patchSCIMUser: import("better-auth").StrictEndpoint<"/scim/v2/Users/:userId", {
                method: "PATCH";
                body: import("zod").ZodObject<{
                    schemas: import("zod").ZodArray<import("zod").ZodString>;
                    Operations: import("zod").ZodArray<import("zod").ZodObject<{
                        op: import("zod").ZodPipe<import("zod").ZodDefault<import("zod").ZodString>, import("zod").ZodEnum<{
                            replace: "replace";
                            add: "add";
                            remove: "remove";
                        }>>;
                        path: import("zod").ZodOptional<import("zod").ZodString>;
                        value: import("zod").ZodAny;
                    }, import("zod/v4/core").$strip>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "204": {
                                description: string;
                            };
                        };
                    };
                    scope: "server";
                };
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    authSCIMToken: string;
                    scimProvider: Omit<import("@better-auth/scim").SCIMProvider, "id">;
                }>)[];
            }, void>;
            deleteSCIMUser: import("better-auth").StrictEndpoint<"/scim/v2/Users/:userId", {
                method: "DELETE";
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "204": {
                                description: string;
                            };
                        };
                    };
                    scope: "server";
                };
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    authSCIMToken: string;
                    scimProvider: Omit<import("@better-auth/scim").SCIMProvider, "id">;
                }>)[];
            }, void>;
            updateSCIMUser: import("better-auth").StrictEndpoint<"/scim/v2/Users/:userId", {
                method: "PUT";
                body: import("zod").ZodObject<{
                    userName: import("zod").ZodString;
                    externalId: import("zod").ZodOptional<import("zod").ZodString>;
                    name: import("zod").ZodOptional<import("zod").ZodObject<{
                        formatted: import("zod").ZodOptional<import("zod").ZodString>;
                        givenName: import("zod").ZodOptional<import("zod").ZodString>;
                        familyName: import("zod").ZodOptional<import("zod").ZodString>;
                    }, import("zod/v4/core").$strip>>;
                    emails: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                        value: import("zod").ZodEmail;
                        primary: import("zod").ZodOptional<import("zod").ZodBoolean>;
                    }, import("zod/v4/core").$strip>>>;
                    active: import("zod").ZodOptional<import("zod").ZodBoolean>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                };
                                                readonly meta: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly resourceType: {
                                                            readonly type: "string";
                                                        };
                                                        readonly created: {
                                                            readonly type: "string";
                                                            readonly format: "date-time";
                                                        };
                                                        readonly lastModified: {
                                                            readonly type: "string";
                                                            readonly format: "date-time";
                                                        };
                                                        readonly location: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                };
                                                readonly userName: {
                                                    readonly type: "string";
                                                };
                                                readonly name: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly formatted: {
                                                            readonly type: "string";
                                                        };
                                                        readonly givenName: {
                                                            readonly type: "string";
                                                        };
                                                        readonly familyName: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                };
                                                readonly displayName: {
                                                    readonly type: "string";
                                                };
                                                readonly active: {
                                                    readonly type: "boolean";
                                                };
                                                readonly emails: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly value: {
                                                                readonly type: "string";
                                                            };
                                                            readonly primary: {
                                                                readonly type: "boolean";
                                                            };
                                                        };
                                                    };
                                                };
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    authSCIMToken: string;
                    scimProvider: Omit<import("@better-auth/scim").SCIMProvider, "id">;
                }>)[];
            }, {
                id: string;
                externalId: string | undefined;
                meta: {
                    resourceType: string;
                    created: Date;
                    lastModified: Date;
                    location: string;
                };
                userName: string;
                name: {
                    formatted: string;
                };
                displayName: string;
                active: boolean;
                emails: {
                    primary: boolean;
                    value: string;
                }[];
                schemas: string[];
            }>;
            listSCIMUsers: import("better-auth").StrictEndpoint<"/scim/v2/Users", {
                method: "GET";
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    filter: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                totalResults: {
                                                    type: string;
                                                };
                                                itemsPerPage: {
                                                    type: string;
                                                };
                                                startIndex: {
                                                    type: string;
                                                };
                                                Resources: {
                                                    type: string;
                                                    items: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly id: {
                                                                readonly type: "string";
                                                            };
                                                            readonly meta: {
                                                                readonly type: "object";
                                                                readonly properties: {
                                                                    readonly resourceType: {
                                                                        readonly type: "string";
                                                                    };
                                                                    readonly created: {
                                                                        readonly type: "string";
                                                                        readonly format: "date-time";
                                                                    };
                                                                    readonly lastModified: {
                                                                        readonly type: "string";
                                                                        readonly format: "date-time";
                                                                    };
                                                                    readonly location: {
                                                                        readonly type: "string";
                                                                    };
                                                                };
                                                            };
                                                            readonly userName: {
                                                                readonly type: "string";
                                                            };
                                                            readonly name: {
                                                                readonly type: "object";
                                                                readonly properties: {
                                                                    readonly formatted: {
                                                                        readonly type: "string";
                                                                    };
                                                                    readonly givenName: {
                                                                        readonly type: "string";
                                                                    };
                                                                    readonly familyName: {
                                                                        readonly type: "string";
                                                                    };
                                                                };
                                                            };
                                                            readonly displayName: {
                                                                readonly type: "string";
                                                            };
                                                            readonly active: {
                                                                readonly type: "boolean";
                                                            };
                                                            readonly emails: {
                                                                readonly type: "array";
                                                                readonly items: {
                                                                    readonly type: "object";
                                                                    readonly properties: {
                                                                        readonly value: {
                                                                            readonly type: "string";
                                                                        };
                                                                        readonly primary: {
                                                                            readonly type: "boolean";
                                                                        };
                                                                    };
                                                                };
                                                            };
                                                            readonly schemas: {
                                                                readonly type: "array";
                                                                readonly items: {
                                                                    readonly type: "string";
                                                                };
                                                            };
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    authSCIMToken: string;
                    scimProvider: Omit<import("@better-auth/scim").SCIMProvider, "id">;
                }>)[];
            }, {
                readonly schemas: readonly ["urn:ietf:params:scim:api:messages:2.0:ListResponse"];
                readonly totalResults: 0;
                readonly startIndex: 1;
                readonly itemsPerPage: 0;
                readonly Resources: readonly [];
            } | {
                schemas: string[];
                totalResults: number;
                startIndex: number;
                itemsPerPage: number;
                Resources: {
                    id: string;
                    externalId: string | undefined;
                    meta: {
                        resourceType: string;
                        created: Date;
                        lastModified: Date;
                        location: string;
                    };
                    userName: string;
                    name: {
                        formatted: string;
                    };
                    displayName: string;
                    active: boolean;
                    emails: {
                        primary: boolean;
                        value: string;
                    }[];
                    schemas: string[];
                }[];
            }>;
            getSCIMServiceProviderConfig: import("better-auth").StrictEndpoint<"/scim/v2/ServiceProviderConfig", {
                method: "GET";
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly patch: {
                                                    type: string;
                                                    properties: {
                                                        supported: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                                readonly bulk: {
                                                    type: string;
                                                    properties: {
                                                        supported: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                                readonly filter: {
                                                    type: string;
                                                    properties: {
                                                        supported: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                                readonly changePassword: {
                                                    type: string;
                                                    properties: {
                                                        supported: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                                readonly sort: {
                                                    type: string;
                                                    properties: {
                                                        supported: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                                readonly etag: {
                                                    type: string;
                                                    properties: {
                                                        supported: {
                                                            type: string;
                                                        };
                                                    };
                                                };
                                                readonly authenticationSchemes: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly name: {
                                                                readonly type: "string";
                                                            };
                                                            readonly description: {
                                                                readonly type: "string";
                                                            };
                                                            readonly specUri: {
                                                                readonly type: "string";
                                                            };
                                                            readonly type: {
                                                                readonly type: "string";
                                                            };
                                                            readonly primary: {
                                                                readonly type: "boolean";
                                                            };
                                                        };
                                                    };
                                                };
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly meta: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly resourceType: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
            }, {
                patch: {
                    supported: boolean;
                };
                bulk: {
                    supported: boolean;
                };
                filter: {
                    supported: boolean;
                };
                changePassword: {
                    supported: boolean;
                };
                sort: {
                    supported: boolean;
                };
                etag: {
                    supported: boolean;
                };
                authenticationSchemes: {
                    name: string;
                    description: string;
                    specUri: string;
                    type: string;
                    primary: boolean;
                }[];
                schemas: string[];
                meta: {
                    resourceType: string;
                };
            }>;
            getSCIMSchemas: import("better-auth").StrictEndpoint<"/scim/v2/Schemas", {
                method: "GET";
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "array";
                                            items: {
                                                readonly type: "object";
                                                readonly properties: {
                                                    readonly id: {
                                                        readonly type: "string";
                                                    };
                                                    readonly schemas: {
                                                        readonly type: "array";
                                                        readonly items: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                    readonly name: {
                                                        readonly type: "string";
                                                    };
                                                    readonly description: {
                                                        readonly type: "string";
                                                    };
                                                    readonly attributes: {
                                                        readonly type: "array";
                                                        readonly items: {
                                                            readonly properties: {
                                                                readonly subAttributes: {
                                                                    readonly type: "array";
                                                                    readonly items: {
                                                                        readonly type: "object";
                                                                        readonly properties: {
                                                                            readonly name: {
                                                                                readonly type: "string";
                                                                            };
                                                                            readonly type: {
                                                                                readonly type: "string";
                                                                            };
                                                                            readonly multiValued: {
                                                                                readonly type: "boolean";
                                                                            };
                                                                            readonly description: {
                                                                                readonly type: "string";
                                                                            };
                                                                            readonly required: {
                                                                                readonly type: "boolean";
                                                                            };
                                                                            readonly caseExact: {
                                                                                readonly type: "boolean";
                                                                            };
                                                                            readonly mutability: {
                                                                                readonly type: "string";
                                                                            };
                                                                            readonly returned: {
                                                                                readonly type: "string";
                                                                            };
                                                                            readonly uniqueness: {
                                                                                readonly type: "string";
                                                                            };
                                                                        };
                                                                    };
                                                                };
                                                                readonly name: {
                                                                    readonly type: "string";
                                                                };
                                                                readonly type: {
                                                                    readonly type: "string";
                                                                };
                                                                readonly multiValued: {
                                                                    readonly type: "boolean";
                                                                };
                                                                readonly description: {
                                                                    readonly type: "string";
                                                                };
                                                                readonly required: {
                                                                    readonly type: "boolean";
                                                                };
                                                                readonly caseExact: {
                                                                    readonly type: "boolean";
                                                                };
                                                                readonly mutability: {
                                                                    readonly type: "string";
                                                                };
                                                                readonly returned: {
                                                                    readonly type: "string";
                                                                };
                                                                readonly uniqueness: {
                                                                    readonly type: "string";
                                                                };
                                                            };
                                                            readonly type: "object";
                                                        };
                                                    };
                                                    readonly meta: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly resourceType: {
                                                                readonly type: "string";
                                                            };
                                                            readonly location: {
                                                                readonly type: "string";
                                                            };
                                                        };
                                                        readonly required: readonly ["resourceType", "location"];
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
            }, {
                totalResults: number;
                itemsPerPage: number;
                startIndex: number;
                schemas: string[];
                Resources: {
                    meta: {
                        location: string;
                        resourceType: string;
                    };
                    id: string;
                    schemas: string[];
                    name: string;
                    description: string;
                    attributes: ({
                        name: string;
                        type: string;
                        multiValued: boolean;
                        description: string;
                        required: boolean;
                        caseExact: boolean;
                        mutability: string;
                        returned: string;
                        uniqueness: string;
                        subAttributes?: undefined;
                    } | {
                        name: string;
                        type: string;
                        multiValued: boolean;
                        description: string;
                        required: boolean;
                        mutability: string;
                        returned: string;
                        caseExact?: undefined;
                        uniqueness?: undefined;
                        subAttributes?: undefined;
                    } | {
                        name: string;
                        type: string;
                        multiValued: boolean;
                        description: string;
                        required: boolean;
                        subAttributes: {
                            name: string;
                            type: string;
                            multiValued: boolean;
                            description: string;
                            required: boolean;
                            caseExact: boolean;
                            mutability: string;
                            returned: string;
                            uniqueness: string;
                        }[];
                        caseExact?: undefined;
                        mutability?: undefined;
                        returned?: undefined;
                        uniqueness?: undefined;
                    } | {
                        name: string;
                        type: string;
                        multiValued: boolean;
                        description: string;
                        required: boolean;
                        subAttributes: ({
                            name: string;
                            type: string;
                            multiValued: boolean;
                            description: string;
                            required: boolean;
                            caseExact: boolean;
                            mutability: string;
                            returned: string;
                            uniqueness: string;
                        } | {
                            name: string;
                            type: string;
                            multiValued: boolean;
                            description: string;
                            required: boolean;
                            mutability: string;
                            returned: string;
                            caseExact?: undefined;
                            uniqueness?: undefined;
                        })[];
                        mutability: string;
                        returned: string;
                        uniqueness: string;
                        caseExact?: undefined;
                    })[];
                }[];
            }>;
            getSCIMSchema: import("better-auth").StrictEndpoint<"/scim/v2/Schemas/:schemaId", {
                method: "GET";
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly id: {
                                                    readonly type: "string";
                                                };
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly name: {
                                                    readonly type: "string";
                                                };
                                                readonly description: {
                                                    readonly type: "string";
                                                };
                                                readonly attributes: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly properties: {
                                                            readonly subAttributes: {
                                                                readonly type: "array";
                                                                readonly items: {
                                                                    readonly type: "object";
                                                                    readonly properties: {
                                                                        readonly name: {
                                                                            readonly type: "string";
                                                                        };
                                                                        readonly type: {
                                                                            readonly type: "string";
                                                                        };
                                                                        readonly multiValued: {
                                                                            readonly type: "boolean";
                                                                        };
                                                                        readonly description: {
                                                                            readonly type: "string";
                                                                        };
                                                                        readonly required: {
                                                                            readonly type: "boolean";
                                                                        };
                                                                        readonly caseExact: {
                                                                            readonly type: "boolean";
                                                                        };
                                                                        readonly mutability: {
                                                                            readonly type: "string";
                                                                        };
                                                                        readonly returned: {
                                                                            readonly type: "string";
                                                                        };
                                                                        readonly uniqueness: {
                                                                            readonly type: "string";
                                                                        };
                                                                    };
                                                                };
                                                            };
                                                            readonly name: {
                                                                readonly type: "string";
                                                            };
                                                            readonly type: {
                                                                readonly type: "string";
                                                            };
                                                            readonly multiValued: {
                                                                readonly type: "boolean";
                                                            };
                                                            readonly description: {
                                                                readonly type: "string";
                                                            };
                                                            readonly required: {
                                                                readonly type: "boolean";
                                                            };
                                                            readonly caseExact: {
                                                                readonly type: "boolean";
                                                            };
                                                            readonly mutability: {
                                                                readonly type: "string";
                                                            };
                                                            readonly returned: {
                                                                readonly type: "string";
                                                            };
                                                            readonly uniqueness: {
                                                                readonly type: "string";
                                                            };
                                                        };
                                                        readonly type: "object";
                                                    };
                                                };
                                                readonly meta: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly resourceType: {
                                                            readonly type: "string";
                                                        };
                                                        readonly location: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                    readonly required: readonly ["resourceType", "location"];
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
            }, {
                meta: {
                    location: string;
                    resourceType: string;
                };
                id: string;
                schemas: string[];
                name: string;
                description: string;
                attributes: ({
                    name: string;
                    type: string;
                    multiValued: boolean;
                    description: string;
                    required: boolean;
                    caseExact: boolean;
                    mutability: string;
                    returned: string;
                    uniqueness: string;
                    subAttributes?: undefined;
                } | {
                    name: string;
                    type: string;
                    multiValued: boolean;
                    description: string;
                    required: boolean;
                    mutability: string;
                    returned: string;
                    caseExact?: undefined;
                    uniqueness?: undefined;
                    subAttributes?: undefined;
                } | {
                    name: string;
                    type: string;
                    multiValued: boolean;
                    description: string;
                    required: boolean;
                    subAttributes: {
                        name: string;
                        type: string;
                        multiValued: boolean;
                        description: string;
                        required: boolean;
                        caseExact: boolean;
                        mutability: string;
                        returned: string;
                        uniqueness: string;
                    }[];
                    caseExact?: undefined;
                    mutability?: undefined;
                    returned?: undefined;
                    uniqueness?: undefined;
                } | {
                    name: string;
                    type: string;
                    multiValued: boolean;
                    description: string;
                    required: boolean;
                    subAttributes: ({
                        name: string;
                        type: string;
                        multiValued: boolean;
                        description: string;
                        required: boolean;
                        caseExact: boolean;
                        mutability: string;
                        returned: string;
                        uniqueness: string;
                    } | {
                        name: string;
                        type: string;
                        multiValued: boolean;
                        description: string;
                        required: boolean;
                        mutability: string;
                        returned: string;
                        caseExact?: undefined;
                        uniqueness?: undefined;
                    })[];
                    mutability: string;
                    returned: string;
                    uniqueness: string;
                    caseExact?: undefined;
                })[];
            }>;
            getSCIMResourceTypes: import("better-auth").StrictEndpoint<"/scim/v2/ResourceTypes", {
                method: "GET";
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                totalResults: {
                                                    type: string;
                                                };
                                                itemsPerPage: {
                                                    type: string;
                                                };
                                                startIndex: {
                                                    type: string;
                                                };
                                                Resources: {
                                                    type: string;
                                                    items: {
                                                        readonly type: "object";
                                                        readonly properties: {
                                                            readonly schemas: {
                                                                readonly type: "array";
                                                                readonly items: {
                                                                    readonly type: "string";
                                                                };
                                                            };
                                                            readonly id: {
                                                                readonly type: "string";
                                                            };
                                                            readonly name: {
                                                                readonly type: "string";
                                                            };
                                                            readonly endpoint: {
                                                                readonly type: "string";
                                                            };
                                                            readonly description: {
                                                                readonly type: "string";
                                                            };
                                                            readonly schema: {
                                                                readonly type: "string";
                                                            };
                                                            readonly meta: {
                                                                readonly type: "object";
                                                                readonly properties: {
                                                                    readonly resourceType: {
                                                                        readonly type: "string";
                                                                    };
                                                                    readonly location: {
                                                                        readonly type: "string";
                                                                    };
                                                                };
                                                            };
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
            }, {
                totalResults: number;
                itemsPerPage: number;
                startIndex: number;
                schemas: string[];
                Resources: {
                    meta: {
                        location: string;
                        resourceType: string;
                    };
                    schemas: string[];
                    id: string;
                    name: string;
                    endpoint: string;
                    description: string;
                    schema: string;
                }[];
            }>;
            getSCIMResourceType: import("better-auth").StrictEndpoint<"/scim/v2/ResourceTypes/:resourceTypeId", {
                method: "GET";
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "400": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "401": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "403": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "404": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "429": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "500": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly status: {
                                                    readonly type: "string";
                                                };
                                                readonly detail: {
                                                    readonly type: "string";
                                                };
                                                readonly scimType: {
                                                    readonly type: "string";
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            readonly type: "object";
                                            readonly properties: {
                                                readonly schemas: {
                                                    readonly type: "array";
                                                    readonly items: {
                                                        readonly type: "string";
                                                    };
                                                };
                                                readonly id: {
                                                    readonly type: "string";
                                                };
                                                readonly name: {
                                                    readonly type: "string";
                                                };
                                                readonly endpoint: {
                                                    readonly type: "string";
                                                };
                                                readonly description: {
                                                    readonly type: "string";
                                                };
                                                readonly schema: {
                                                    readonly type: "string";
                                                };
                                                readonly meta: {
                                                    readonly type: "object";
                                                    readonly properties: {
                                                        readonly resourceType: {
                                                            readonly type: "string";
                                                        };
                                                        readonly location: {
                                                            readonly type: "string";
                                                        };
                                                    };
                                                };
                                            };
                                        };
                                    };
                                };
                            };
                        };
                    };
                    scope: "server";
                };
            }, {
                meta: {
                    location: string;
                    resourceType: string;
                };
                schemas: string[];
                id: string;
                name: string;
                endpoint: string;
                description: string;
                schema: string;
            }>;
        };
        schema: {
            scimProvider: {
                fields: {
                    userId?: {
                        type: "string";
                        required: false;
                    } | undefined;
                    providerId: {
                        type: "string";
                        required: true;
                        unique: true;
                    };
                    scimToken: {
                        type: "string";
                        required: true;
                        unique: true;
                    };
                    organizationId: {
                        type: "string";
                        required: false;
                    };
                };
            };
        };
        options: import("@better-auth/scim").SCIMOptions | undefined;
    } | {
        id: "sso";
        version: string;
        endpoints: {
            spMetadata: ReturnType<(options?: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/saml2/sp/metadata", {
                method: "GET";
                query: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                    format: import("zod").ZodDefault<import("zod").ZodEnum<{
                        json: "json";
                        xml: "xml";
                    }>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                            };
                        };
                    };
                };
            }, Response>>;
            registerSSOProvider: import("better-auth").StrictEndpoint<"/sso/register", {
                method: "POST";
                body: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                    issuer: import("zod").ZodString;
                    domain: import("zod").ZodString;
                    oidcConfig: import("zod").ZodOptional<import("zod").ZodObject<{
                        clientId: import("zod").ZodString;
                        clientSecret: import("zod").ZodString;
                        authorizationEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        tokenEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        userInfoEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        tokenEndpointAuthentication: import("zod").ZodOptional<import("zod").ZodEnum<{
                            client_secret_post: "client_secret_post";
                            client_secret_basic: "client_secret_basic";
                        }>>;
                        jwksEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        discoveryEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        skipDiscovery: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        scopes: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                        pkce: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodBoolean>>;
                        mapping: import("zod").ZodOptional<import("zod").ZodObject<{
                            id: import("zod").ZodString;
                            email: import("zod").ZodString;
                            emailVerified: import("zod").ZodOptional<import("zod").ZodString>;
                            name: import("zod").ZodString;
                            image: import("zod").ZodOptional<import("zod").ZodString>;
                            extraFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                        }, import("zod/v4/core").$strip>>;
                    }, import("zod/v4/core").$strip>>;
                    samlConfig: import("zod").ZodOptional<import("zod").ZodObject<{
                        entryPoint: import("zod").ZodString;
                        cert: import("zod").ZodString;
                        callbackUrl: import("zod").ZodString;
                        idpInitiatedCallbackUrl: import("zod").ZodOptional<import("zod").ZodString>;
                        audience: import("zod").ZodOptional<import("zod").ZodString>;
                        idpMetadata: import("zod").ZodOptional<import("zod").ZodObject<{
                            metadata: import("zod").ZodOptional<import("zod").ZodString>;
                            entityID: import("zod").ZodOptional<import("zod").ZodString>;
                            cert: import("zod").ZodOptional<import("zod").ZodString>;
                            privateKey: import("zod").ZodOptional<import("zod").ZodString>;
                            privateKeyPass: import("zod").ZodOptional<import("zod").ZodString>;
                            isAssertionEncrypted: import("zod").ZodOptional<import("zod").ZodBoolean>;
                            encPrivateKey: import("zod").ZodOptional<import("zod").ZodString>;
                            encPrivateKeyPass: import("zod").ZodOptional<import("zod").ZodString>;
                            singleSignOnService: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                                Binding: import("zod").ZodString;
                                Location: import("zod").ZodString;
                            }, import("zod/v4/core").$strip>>>;
                        }, import("zod/v4/core").$strip>>;
                        spMetadata: import("zod").ZodObject<{
                            metadata: import("zod").ZodOptional<import("zod").ZodString>;
                            entityID: import("zod").ZodOptional<import("zod").ZodString>;
                            binding: import("zod").ZodOptional<import("zod").ZodString>;
                            privateKey: import("zod").ZodOptional<import("zod").ZodString>;
                            privateKeyPass: import("zod").ZodOptional<import("zod").ZodString>;
                            isAssertionEncrypted: import("zod").ZodOptional<import("zod").ZodBoolean>;
                            encPrivateKey: import("zod").ZodOptional<import("zod").ZodString>;
                            encPrivateKeyPass: import("zod").ZodOptional<import("zod").ZodString>;
                        }, import("zod/v4/core").$strip>;
                        wantAssertionsSigned: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        authnRequestsSigned: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        signatureAlgorithm: import("zod").ZodOptional<import("zod").ZodString>;
                        digestAlgorithm: import("zod").ZodOptional<import("zod").ZodString>;
                        identifierFormat: import("zod").ZodOptional<import("zod").ZodString>;
                        privateKey: import("zod").ZodOptional<import("zod").ZodString>;
                        decryptionPvk: import("zod").ZodOptional<import("zod").ZodString>;
                        additionalParams: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                        mapping: import("zod").ZodOptional<import("zod").ZodObject<{
                            id: import("zod").ZodString;
                            email: import("zod").ZodString;
                            emailVerified: import("zod").ZodOptional<import("zod").ZodString>;
                            name: import("zod").ZodString;
                            firstName: import("zod").ZodOptional<import("zod").ZodString>;
                            lastName: import("zod").ZodOptional<import("zod").ZodString>;
                            extraFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                        }, import("zod/v4/core").$strip>>;
                    }, import("zod/v4/core").$strip>>;
                    organizationId: import("zod").ZodOptional<import("zod").ZodString>;
                    overrideUserInfo: import("zod").ZodOptional<import("zod").ZodDefault<import("zod").ZodBoolean>>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                issuer: {
                                                    type: string;
                                                    format: string;
                                                    description: string;
                                                };
                                                domain: {
                                                    type: string;
                                                    description: string;
                                                };
                                                domainVerified: {
                                                    type: string;
                                                    description: string;
                                                };
                                                domainVerificationToken: {
                                                    type: string;
                                                    description: string;
                                                };
                                                oidcConfig: {
                                                    type: string;
                                                    properties: {
                                                        issuer: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                        pkce: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        clientId: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        clientSecret: {
                                                            type: string;
                                                            description: string;
                                                        };
                                                        authorizationEndpoint: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        discoveryEndpoint: {
                                                            type: string;
                                                            format: string;
                                                            description: string;
                                                        };
                                                        userInfoEndpoint: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        scopes: {
                                                            type: string;
                                                            items: {
                                                                type: string;
                                                            };
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        tokenEndpoint: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        tokenEndpointAuthentication: {
                                                            type: string;
                                                            enum: string[];
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        jwksEndpoint: {
                                                            type: string;
                                                            format: string;
                                                            nullable: boolean;
                                                            description: string;
                                                        };
                                                        mapping: {
                                                            type: string;
                                                            nullable: boolean;
                                                            properties: {
                                                                id: {
                                                                    type: string;
                                                                    description: string;
                                                                };
                                                                email: {
                                                                    type: string;
                                                                    description: string;
                                                                };
                                                                emailVerified: {
                                                                    type: string;
                                                                    nullable: boolean;
                                                                    description: string;
                                                                };
                                                                name: {
                                                                    type: string;
                                                                    description: string;
                                                                };
                                                                image: {
                                                                    type: string;
                                                                    nullable: boolean;
                                                                    description: string;
                                                                };
                                                                extraFields: {
                                                                    type: string;
                                                                    additionalProperties: {
                                                                        type: string;
                                                                    };
                                                                    nullable: boolean;
                                                                    description: string;
                                                                };
                                                            };
                                                            required: string[];
                                                        };
                                                    };
                                                    required: string[];
                                                    description: string;
                                                };
                                                organizationId: {
                                                    type: string;
                                                    nullable: boolean;
                                                    description: string;
                                                };
                                                userId: {
                                                    type: string;
                                                    description: string;
                                                };
                                                providerId: {
                                                    type: string;
                                                    description: string;
                                                };
                                                redirectURI: {
                                                    type: string;
                                                    format: string;
                                                    description: string;
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                redirectURI: string;
                oidcConfig: import("@better-auth/sso").OIDCConfig | null;
                samlConfig: import("@better-auth/sso").SAMLConfig | null;
            } & Omit<{
                issuer: string;
                oidcConfig?: import("@better-auth/sso").OIDCConfig | undefined;
                samlConfig?: import("@better-auth/sso").SAMLConfig | undefined;
                userId: string;
                providerId: string;
                organizationId?: string | undefined;
                domain: string;
            }, "oidcConfig" | "samlConfig">>;
            signInSSO: ReturnType<(options?: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sign-in/sso", {
                method: "POST";
                body: import("zod").ZodObject<{
                    email: import("zod").ZodOptional<import("zod").ZodString>;
                    organizationSlug: import("zod").ZodOptional<import("zod").ZodString>;
                    providerId: import("zod").ZodOptional<import("zod").ZodString>;
                    domain: import("zod").ZodOptional<import("zod").ZodString>;
                    callbackURL: import("zod").ZodString;
                    errorCallbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                    newUserCallbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                    scopes: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                    loginHint: import("zod").ZodOptional<import("zod").ZodString>;
                    requestSignUp: import("zod").ZodOptional<import("zod").ZodBoolean>;
                    providerType: import("zod").ZodOptional<import("zod").ZodEnum<{
                        saml: "saml";
                        oidc: "oidc";
                    }>>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        requestBody: {
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object";
                                        properties: {
                                            email: {
                                                type: string;
                                                description: string;
                                            };
                                            issuer: {
                                                type: string;
                                                description: string;
                                            };
                                            providerId: {
                                                type: string;
                                                description: string;
                                            };
                                            callbackURL: {
                                                type: string;
                                                description: string;
                                            };
                                            errorCallbackURL: {
                                                type: string;
                                                description: string;
                                            };
                                            newUserCallbackURL: {
                                                type: string;
                                                description: string;
                                            };
                                            loginHint: {
                                                type: string;
                                                description: string;
                                            };
                                        };
                                        required: string[];
                                    };
                                };
                            };
                        };
                        responses: {
                            "200": {
                                description: string;
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object";
                                            properties: {
                                                url: {
                                                    type: string;
                                                    format: string;
                                                    description: string;
                                                };
                                                redirect: {
                                                    type: string;
                                                    description: string;
                                                    enum: boolean[];
                                                };
                                            };
                                            required: string[];
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            }, {
                url: string;
                redirect: boolean;
            }>>;
            callbackSSO: ReturnType<(options?: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/callback/:providerId", {
                method: "GET";
                query: import("zod").ZodObject<{
                    code: import("zod").ZodOptional<import("zod").ZodString>;
                    state: import("zod").ZodString;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    error_description: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                allowedMediaTypes: readonly ["application/x-www-form-urlencoded", "application/json"];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "302": {
                                description: string;
                            };
                        };
                    };
                    scope: "server";
                };
            }, void>>;
            callbackSSOShared: ReturnType<(options?: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/callback", {
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "302": {
                                description: string;
                            };
                        };
                    };
                    scope: "server";
                };
                method: "GET";
                query: import("zod").ZodObject<{
                    code: import("zod").ZodOptional<import("zod").ZodString>;
                    state: import("zod").ZodString;
                    error: import("zod").ZodOptional<import("zod").ZodString>;
                    error_description: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                allowedMediaTypes: readonly ["application/x-www-form-urlencoded", "application/json"];
            }, void>>;
            callbackSSOSAML: ReturnType<(options?: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/saml2/callback/:providerId", {
                method: ("GET" | "POST")[];
                body: import("zod").ZodOptional<import("zod").ZodObject<{
                    SAMLResponse: import("zod").ZodString;
                    RelayState: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    RelayState: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "302": {
                                description: string;
                            };
                            "400": {
                                description: string;
                            };
                            "401": {
                                description: string;
                            };
                        };
                    };
                    scope: "server";
                };
            }, never>>;
            acsEndpoint: ReturnType<(options?: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/saml2/sp/acs/:providerId", {
                method: "POST";
                body: import("zod").ZodObject<{
                    SAMLResponse: import("zod").ZodString;
                    RelayState: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    allowedMediaTypes: string[];
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "302": {
                                description: string;
                            };
                        };
                    };
                    scope: "server";
                };
            }, never>>;
            sloEndpoint: ReturnType<(options?: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/saml2/sp/slo/:providerId", {
                method: ("GET" | "POST")[];
                body: import("zod").ZodOptional<import("zod").ZodObject<{
                    SAMLRequest: import("zod").ZodOptional<import("zod").ZodString>;
                    SAMLResponse: import("zod").ZodOptional<import("zod").ZodString>;
                    RelayState: import("zod").ZodOptional<import("zod").ZodString>;
                    SigAlg: import("zod").ZodOptional<import("zod").ZodString>;
                    Signature: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                query: import("zod").ZodOptional<import("zod").ZodObject<{
                    SAMLRequest: import("zod").ZodOptional<import("zod").ZodString>;
                    SAMLResponse: import("zod").ZodOptional<import("zod").ZodString>;
                    RelayState: import("zod").ZodOptional<import("zod").ZodString>;
                    SigAlg: import("zod").ZodOptional<import("zod").ZodString>;
                    Signature: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>>;
                metadata: {
                    allowedMediaTypes: string[];
                    scope: "server";
                };
            }, void | Response>>;
            initiateSLO: ReturnType<(options?: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/saml2/logout/:providerId", {
                method: "POST";
                body: import("zod").ZodObject<{
                    callbackURL: import("zod").ZodOptional<import("zod").ZodString>;
                }, import("zod/v4/core").$strip>;
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                metadata: {
                    readonly scope: "server";
                };
            }, never>>;
            listSSOProviders: ReturnType<() => import("better-auth").StrictEndpoint<"/sso/providers", {
                method: "GET";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                            };
                        };
                    };
                };
            }, {
                providers: {
                    providerId: string;
                    type: string;
                    issuer: string;
                    domain: string;
                    organizationId: string | null;
                    domainVerified: boolean;
                    oidcConfig: {
                        discoveryEndpoint: string;
                        clientIdLastFour: string;
                        pkce: boolean;
                        authorizationEndpoint: string | undefined;
                        tokenEndpoint: string | undefined;
                        userInfoEndpoint: string | undefined;
                        jwksEndpoint: string | undefined;
                        scopes: string[] | undefined;
                        tokenEndpointAuthentication: "client_secret_post" | "client_secret_basic" | undefined;
                    } | undefined;
                    samlConfig: {
                        entryPoint: string;
                        callbackUrl: string;
                        idpInitiatedCallbackUrl: string | undefined;
                        audience: string | undefined;
                        wantAssertionsSigned: boolean | undefined;
                        authnRequestsSigned: boolean | undefined;
                        identifierFormat: string | undefined;
                        signatureAlgorithm: string | undefined;
                        digestAlgorithm: string | undefined;
                        certificate: {
                            fingerprintSha256: string;
                            notBefore: string;
                            notAfter: string;
                            publicKeyAlgorithm: string;
                        } | {
                            error: string;
                        };
                    } | undefined;
                    spMetadataUrl: string;
                }[];
            }>>;
            getSSOProvider: ReturnType<() => import("better-auth").StrictEndpoint<"/sso/get-provider", {
                method: "GET";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                query: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                            };
                            "404": {
                                description: string;
                            };
                            "403": {
                                description: string;
                            };
                        };
                    };
                };
            }, {
                providerId: string;
                type: string;
                issuer: string;
                domain: string;
                organizationId: string | null;
                domainVerified: boolean;
                oidcConfig: {
                    discoveryEndpoint: string;
                    clientIdLastFour: string;
                    pkce: boolean;
                    authorizationEndpoint: string | undefined;
                    tokenEndpoint: string | undefined;
                    userInfoEndpoint: string | undefined;
                    jwksEndpoint: string | undefined;
                    scopes: string[] | undefined;
                    tokenEndpointAuthentication: "client_secret_post" | "client_secret_basic" | undefined;
                } | undefined;
                samlConfig: {
                    entryPoint: string;
                    callbackUrl: string;
                    idpInitiatedCallbackUrl: string | undefined;
                    audience: string | undefined;
                    wantAssertionsSigned: boolean | undefined;
                    authnRequestsSigned: boolean | undefined;
                    identifierFormat: string | undefined;
                    signatureAlgorithm: string | undefined;
                    digestAlgorithm: string | undefined;
                    certificate: {
                        fingerprintSha256: string;
                        notBefore: string;
                        notAfter: string;
                        publicKeyAlgorithm: string;
                    } | {
                        error: string;
                    };
                } | undefined;
                spMetadataUrl: string;
            }>>;
            updateSSOProvider: ReturnType<(options: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/update-provider", {
                method: "POST";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                body: import("zod").ZodObject<{
                    issuer: import("zod").ZodOptional<import("zod").ZodString>;
                    domain: import("zod").ZodOptional<import("zod").ZodString>;
                    oidcConfig: import("zod").ZodOptional<import("zod").ZodObject<{
                        clientId: import("zod").ZodOptional<import("zod").ZodString>;
                        clientSecret: import("zod").ZodOptional<import("zod").ZodString>;
                        authorizationEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        tokenEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        userInfoEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        tokenEndpointAuthentication: import("zod").ZodOptional<import("zod").ZodEnum<{
                            client_secret_post: "client_secret_post";
                            client_secret_basic: "client_secret_basic";
                        }>>;
                        jwksEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        discoveryEndpoint: import("zod").ZodOptional<import("zod").ZodURL>;
                        scopes: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodString>>;
                        pkce: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        overrideUserInfo: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        mapping: import("zod").ZodOptional<import("zod").ZodObject<{
                            id: import("zod").ZodOptional<import("zod").ZodString>;
                            email: import("zod").ZodOptional<import("zod").ZodString>;
                            emailVerified: import("zod").ZodOptional<import("zod").ZodString>;
                            name: import("zod").ZodOptional<import("zod").ZodString>;
                            image: import("zod").ZodOptional<import("zod").ZodString>;
                            extraFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                        }, import("zod/v4/core").$strip>>;
                    }, import("zod/v4/core").$strip>>;
                    samlConfig: import("zod").ZodOptional<import("zod").ZodObject<{
                        entryPoint: import("zod").ZodOptional<import("zod").ZodString>;
                        cert: import("zod").ZodOptional<import("zod").ZodString>;
                        callbackUrl: import("zod").ZodOptional<import("zod").ZodString>;
                        idpInitiatedCallbackUrl: import("zod").ZodOptional<import("zod").ZodString>;
                        audience: import("zod").ZodOptional<import("zod").ZodString>;
                        idpMetadata: import("zod").ZodOptional<import("zod").ZodObject<{
                            metadata: import("zod").ZodOptional<import("zod").ZodString>;
                            entityID: import("zod").ZodOptional<import("zod").ZodString>;
                            cert: import("zod").ZodOptional<import("zod").ZodString>;
                            privateKey: import("zod").ZodOptional<import("zod").ZodString>;
                            privateKeyPass: import("zod").ZodOptional<import("zod").ZodString>;
                            isAssertionEncrypted: import("zod").ZodOptional<import("zod").ZodBoolean>;
                            encPrivateKey: import("zod").ZodOptional<import("zod").ZodString>;
                            encPrivateKeyPass: import("zod").ZodOptional<import("zod").ZodString>;
                            singleSignOnService: import("zod").ZodOptional<import("zod").ZodArray<import("zod").ZodObject<{
                                Binding: import("zod").ZodString;
                                Location: import("zod").ZodString;
                            }, import("zod/v4/core").$strip>>>;
                        }, import("zod/v4/core").$strip>>;
                        spMetadata: import("zod").ZodOptional<import("zod").ZodObject<{
                            metadata: import("zod").ZodOptional<import("zod").ZodString>;
                            entityID: import("zod").ZodOptional<import("zod").ZodString>;
                            binding: import("zod").ZodOptional<import("zod").ZodString>;
                            privateKey: import("zod").ZodOptional<import("zod").ZodString>;
                            privateKeyPass: import("zod").ZodOptional<import("zod").ZodString>;
                            isAssertionEncrypted: import("zod").ZodOptional<import("zod").ZodBoolean>;
                            encPrivateKey: import("zod").ZodOptional<import("zod").ZodString>;
                            encPrivateKeyPass: import("zod").ZodOptional<import("zod").ZodString>;
                        }, import("zod/v4/core").$strip>>;
                        wantAssertionsSigned: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        authnRequestsSigned: import("zod").ZodOptional<import("zod").ZodBoolean>;
                        signatureAlgorithm: import("zod").ZodOptional<import("zod").ZodString>;
                        digestAlgorithm: import("zod").ZodOptional<import("zod").ZodString>;
                        identifierFormat: import("zod").ZodOptional<import("zod").ZodString>;
                        privateKey: import("zod").ZodOptional<import("zod").ZodString>;
                        decryptionPvk: import("zod").ZodOptional<import("zod").ZodString>;
                        additionalParams: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                        mapping: import("zod").ZodOptional<import("zod").ZodObject<{
                            id: import("zod").ZodOptional<import("zod").ZodString>;
                            email: import("zod").ZodOptional<import("zod").ZodString>;
                            emailVerified: import("zod").ZodOptional<import("zod").ZodString>;
                            name: import("zod").ZodOptional<import("zod").ZodString>;
                            firstName: import("zod").ZodOptional<import("zod").ZodString>;
                            lastName: import("zod").ZodOptional<import("zod").ZodString>;
                            extraFields: import("zod").ZodOptional<import("zod").ZodRecord<import("zod").ZodString, import("zod").ZodAny>>;
                        }, import("zod/v4/core").$strip>>;
                    }, import("zod/v4/core").$strip>>;
                    providerId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                            };
                            "404": {
                                description: string;
                            };
                            "403": {
                                description: string;
                            };
                        };
                    };
                };
            }, {
                providerId: string;
                type: string;
                issuer: string;
                domain: string;
                organizationId: string | null;
                domainVerified: boolean;
                oidcConfig: {
                    discoveryEndpoint: string;
                    clientIdLastFour: string;
                    pkce: boolean;
                    authorizationEndpoint: string | undefined;
                    tokenEndpoint: string | undefined;
                    userInfoEndpoint: string | undefined;
                    jwksEndpoint: string | undefined;
                    scopes: string[] | undefined;
                    tokenEndpointAuthentication: "client_secret_post" | "client_secret_basic" | undefined;
                } | undefined;
                samlConfig: {
                    entryPoint: string;
                    callbackUrl: string;
                    idpInitiatedCallbackUrl: string | undefined;
                    audience: string | undefined;
                    wantAssertionsSigned: boolean | undefined;
                    authnRequestsSigned: boolean | undefined;
                    identifierFormat: string | undefined;
                    signatureAlgorithm: string | undefined;
                    digestAlgorithm: string | undefined;
                    certificate: {
                        fingerprintSha256: string;
                        notBefore: string;
                        notAfter: string;
                        publicKeyAlgorithm: string;
                    } | {
                        error: string;
                    };
                } | undefined;
                spMetadataUrl: string;
            }>>;
            deleteSSOProvider: ReturnType<() => import("better-auth").StrictEndpoint<"/sso/delete-provider", {
                method: "POST";
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
                body: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        operationId: string;
                        summary: string;
                        description: string;
                        responses: {
                            "200": {
                                description: string;
                            };
                            "404": {
                                description: string;
                            };
                            "403": {
                                description: string;
                            };
                        };
                    };
                };
            }, {
                success: boolean;
            }>>;
        } & {
            requestDomainVerification: ReturnType<(options: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/request-domain-verification", {
                method: "POST";
                body: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "404": {
                                description: string;
                            };
                            "409": {
                                description: string;
                            };
                            "201": {
                                description: string;
                            };
                        };
                    };
                };
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
            }, {
                domainVerificationToken: string;
            }>>;
            verifyDomain: ReturnType<(options: import("@better-auth/sso").SSOOptions) => import("better-auth").StrictEndpoint<"/sso/verify-domain", {
                method: "POST";
                body: import("zod").ZodObject<{
                    providerId: import("zod").ZodString;
                }, import("zod/v4/core").$strip>;
                metadata: {
                    openapi: {
                        summary: string;
                        description: string;
                        responses: {
                            "404": {
                                description: string;
                            };
                            "409": {
                                description: string;
                            };
                            "502": {
                                description: string;
                            };
                            "204": {
                                description: string;
                            };
                        };
                    };
                };
                use: ((inputContext: import("better-auth").MiddlewareInputContext<import("better-auth").MiddlewareOptions>) => Promise<{
                    session: {
                        session: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            userId: string;
                            expiresAt: Date;
                            token: string;
                            ipAddress?: string | null | undefined;
                            userAgent?: string | null | undefined;
                        };
                        user: Record<string, any> & {
                            id: string;
                            createdAt: Date;
                            updatedAt: Date;
                            email: string;
                            emailVerified: boolean;
                            name: string;
                            image?: string | null | undefined;
                        };
                    };
                }>)[];
            }, void>>;
        };
        schema: NonNullable<import("better-auth").BetterAuthPlugin["schema"]>;
        options: NoInfer<{
            trustEmailVerified: true;
        }>;
    })[]];
}>;
export type Auth = typeof auth;
