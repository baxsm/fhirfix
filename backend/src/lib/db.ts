import { createDb } from "@shared/db";
import { env } from "./env";

export const db = createDb(env.DATABASE_URL);
export { schema } from "@shared/db";
