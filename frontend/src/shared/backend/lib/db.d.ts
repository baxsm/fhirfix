export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof import("../shared/db/schema")> & {
    $client: import("postgres").Sql<{}>;
};
export { schema } from "@shared/db";
