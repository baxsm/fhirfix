import { schema } from "@/lib/db";
export declare const auditRouter: import("@trpc/server").TRPCBuiltRouter<{
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
        input: {
            workspaceId: string;
            action?: "login" | "run.created" | "run.cancelled" | "report.downloaded" | "report.exported" | "mapping.changed" | "mapping.approved" | "mapping.deprecated" | "mapping.imported" | "key.created" | "key.revoked" | "webhook.created" | "webhook.secret_rotated" | "webhook.deleted" | "member.invited" | "member.role_changed" | "member.removed" | "settings.changed" | "billing.checkout_started" | "billing.auto_recharge_changed" | "billing.spend_cap_changed" | "check.created" | "check.changed" | "check.deleted" | "packet.launched" | "packet.exported" | "data.exported" | "baa.requested" | "sso.configured" | "sso.removed" | "scim.enabled" | "scim.disabled" | "workspace.deleted" | undefined;
            actorId?: string | undefined;
            since?: string | undefined;
            cursor?: string | undefined;
            limit?: number | undefined;
        };
        output: {
            entries: ({
                id: string;
                action: "login" | "run.created" | "run.cancelled" | "report.downloaded" | "report.exported" | "mapping.changed" | "mapping.approved" | "mapping.deprecated" | "mapping.imported" | "key.created" | "key.revoked" | "webhook.created" | "webhook.secret_rotated" | "webhook.deleted" | "member.invited" | "member.role_changed" | "member.removed" | "settings.changed" | "billing.checkout_started" | "billing.auto_recharge_changed" | "billing.spend_cap_changed" | "check.created" | "check.changed" | "check.deleted" | "packet.launched" | "packet.exported" | "data.exported" | "baa.requested" | "sso.configured" | "sso.removed" | "scim.enabled" | "scim.disabled" | "workspace.deleted";
                actorType: "user" | "api_key" | "system";
                actorId: string | null;
                targetRef: string | null;
                ip: string | null;
                metadata: Record<string, unknown> | null;
                createdAt: Date;
            } & {
                actorName: string | null;
            })[];
            nextCursor: string | null;
            hasMore: boolean;
        };
        meta: object;
    }>;
    actions: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
        };
        output: ("login" | "run.created" | "run.cancelled" | "report.downloaded" | "report.exported" | "mapping.changed" | "mapping.approved" | "mapping.deprecated" | "mapping.imported" | "key.created" | "key.revoked" | "webhook.created" | "webhook.secret_rotated" | "webhook.deleted" | "member.invited" | "member.role_changed" | "member.removed" | "settings.changed" | "billing.checkout_started" | "billing.auto_recharge_changed" | "billing.spend_cap_changed" | "check.created" | "check.changed" | "check.deleted" | "packet.launched" | "packet.exported" | "data.exported" | "baa.requested" | "sso.configured" | "sso.removed" | "scim.enabled" | "scim.disabled" | "workspace.deleted")[];
        meta: object;
    }>;
    exportCsv: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            actorId?: string | undefined;
            action?: "login" | "run.created" | "run.cancelled" | "report.downloaded" | "report.exported" | "mapping.changed" | "mapping.approved" | "mapping.deprecated" | "mapping.imported" | "key.created" | "key.revoked" | "webhook.created" | "webhook.secret_rotated" | "webhook.deleted" | "member.invited" | "member.role_changed" | "member.removed" | "settings.changed" | "billing.checkout_started" | "billing.auto_recharge_changed" | "billing.spend_cap_changed" | "check.created" | "check.changed" | "check.deleted" | "packet.launched" | "packet.exported" | "data.exported" | "baa.requested" | "sso.configured" | "sso.removed" | "scim.enabled" | "scim.disabled" | "workspace.deleted" | undefined;
            since?: string | undefined;
        };
        output: ({
            id: string;
            action: "login" | "run.created" | "run.cancelled" | "report.downloaded" | "report.exported" | "mapping.changed" | "mapping.approved" | "mapping.deprecated" | "mapping.imported" | "key.created" | "key.revoked" | "webhook.created" | "webhook.secret_rotated" | "webhook.deleted" | "member.invited" | "member.role_changed" | "member.removed" | "settings.changed" | "billing.checkout_started" | "billing.auto_recharge_changed" | "billing.spend_cap_changed" | "check.created" | "check.changed" | "check.deleted" | "packet.launched" | "packet.exported" | "data.exported" | "baa.requested" | "sso.configured" | "sso.removed" | "scim.enabled" | "scim.disabled" | "workspace.deleted";
            actorType: "user" | "api_key" | "system";
            actorId: string | null;
            targetRef: string | null;
            ip: string | null;
            metadata: Record<string, unknown> | null;
            createdAt: Date;
        } & {
            actorName: string | null;
        })[];
        meta: object;
    }>;
}>>;
