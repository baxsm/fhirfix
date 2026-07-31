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
            action?: "baa.requested" | "billing.auto_recharge_changed" | "billing.checkout_started" | "billing.spend_cap_changed" | "check.changed" | "check.created" | "check.deleted" | "data.exported" | "key.created" | "key.revoked" | "login" | "mapping.approved" | "mapping.changed" | "mapping.deprecated" | "mapping.imported" | "member.invited" | "member.removed" | "member.role_changed" | "packet.exported" | "packet.launched" | "report.downloaded" | "report.exported" | "run.cancelled" | "run.created" | "scim.disabled" | "scim.enabled" | "settings.changed" | "sso.configured" | "sso.removed" | "webhook.created" | "webhook.deleted" | "webhook.secret_rotated" | "workspace.deleted" | undefined;
            actorId?: string | undefined;
            since?: string | undefined;
            cursor?: string | undefined;
            limit?: number | undefined;
        };
        output: {
            entries: ({
                id: string;
                action: "baa.requested" | "billing.auto_recharge_changed" | "billing.checkout_started" | "billing.spend_cap_changed" | "check.changed" | "check.created" | "check.deleted" | "data.exported" | "key.created" | "key.revoked" | "login" | "mapping.approved" | "mapping.changed" | "mapping.deprecated" | "mapping.imported" | "member.invited" | "member.removed" | "member.role_changed" | "packet.exported" | "packet.launched" | "report.downloaded" | "report.exported" | "run.cancelled" | "run.created" | "scim.disabled" | "scim.enabled" | "settings.changed" | "sso.configured" | "sso.removed" | "webhook.created" | "webhook.deleted" | "webhook.secret_rotated" | "workspace.deleted";
                actorType: "api_key" | "system" | "user";
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
        output: ("baa.requested" | "billing.auto_recharge_changed" | "billing.checkout_started" | "billing.spend_cap_changed" | "check.changed" | "check.created" | "check.deleted" | "data.exported" | "key.created" | "key.revoked" | "login" | "mapping.approved" | "mapping.changed" | "mapping.deprecated" | "mapping.imported" | "member.invited" | "member.removed" | "member.role_changed" | "packet.exported" | "packet.launched" | "report.downloaded" | "report.exported" | "run.cancelled" | "run.created" | "scim.disabled" | "scim.enabled" | "settings.changed" | "sso.configured" | "sso.removed" | "webhook.created" | "webhook.deleted" | "webhook.secret_rotated" | "workspace.deleted")[];
        meta: object;
    }>;
    exportCsv: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            workspaceId: string;
            action?: "baa.requested" | "billing.auto_recharge_changed" | "billing.checkout_started" | "billing.spend_cap_changed" | "check.changed" | "check.created" | "check.deleted" | "data.exported" | "key.created" | "key.revoked" | "login" | "mapping.approved" | "mapping.changed" | "mapping.deprecated" | "mapping.imported" | "member.invited" | "member.removed" | "member.role_changed" | "packet.exported" | "packet.launched" | "report.downloaded" | "report.exported" | "run.cancelled" | "run.created" | "scim.disabled" | "scim.enabled" | "settings.changed" | "sso.configured" | "sso.removed" | "webhook.created" | "webhook.deleted" | "webhook.secret_rotated" | "workspace.deleted" | undefined;
            actorId?: string | undefined;
            since?: string | undefined;
        };
        output: ({
            id: string;
            action: "baa.requested" | "billing.auto_recharge_changed" | "billing.checkout_started" | "billing.spend_cap_changed" | "check.changed" | "check.created" | "check.deleted" | "data.exported" | "key.created" | "key.revoked" | "login" | "mapping.approved" | "mapping.changed" | "mapping.deprecated" | "mapping.imported" | "member.invited" | "member.removed" | "member.role_changed" | "packet.exported" | "packet.launched" | "report.downloaded" | "report.exported" | "run.cancelled" | "run.created" | "scim.disabled" | "scim.enabled" | "settings.changed" | "sso.configured" | "sso.removed" | "webhook.created" | "webhook.deleted" | "webhook.secret_rotated" | "workspace.deleted";
            actorType: "api_key" | "system" | "user";
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
