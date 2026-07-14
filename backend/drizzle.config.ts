import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for drizzle-kit");
}

// schema lives in the shared db/ package; migrations are owned by the backend
// (the service that runs them in production).
export default defineConfig({
  dialect: "postgresql",
  schema: "../db/schema/index.ts",
  out: "../db/drizzle",
  dbCredentials: { url: databaseUrl },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
