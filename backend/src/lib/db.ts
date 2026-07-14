import { createDb } from "@fhirfix/db";
import { env } from "./env";

export const db = createDb(env.DATABASE_URL);
export { schema } from "@fhirfix/db";
