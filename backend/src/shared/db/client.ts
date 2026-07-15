import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

// one shared connection factory. backend and worker each create their own client
// from their own DATABASE_URL, so the db package stays free of env coupling.
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
