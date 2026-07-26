import { createDb, schema } from "@shared/db";
import { createBlobStore } from "@shared/db/blob";
import { customAlphabet } from "nanoid";
import { env } from "./env";

export const db = createDb(env.DATABASE_URL);
export { schema };

export const blobStore = createBlobStore(db);
export function blobKey(workspaceId: string, runId: string, kind: "input" | "corrected"): string {
  return `${workspaceId}/${runId}/${kind}.json`;
}

const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);
export function findingId(): string {
  return `fnd_${nano()}`;
}
export function runId(): string {
  return `run_${nano()}`;
}
export function driftAlertId(): string {
  return `drf_${nano()}`;
}
export function mappingId(): string {
  return `map_${nano()}`;
}
export function objectId(): string {
  return `obj_${nano()}`;
}

// minimal structured logger. mirrors the backend's dot-notation context style.
type Level = "error" | "warn" | "info" | "debug";
const ORDER: Record<Level, number> = { error: 0, warn: 1, info: 2, debug: 3 };
const threshold = ORDER[env.LOG_LEVEL];
function log(level: Level, context: string, message: unknown) {
  if (ORDER[level] > threshold) return;
  const line = typeof message === "string" ? message : JSON.stringify(message);
  console[level === "debug" ? "log" : level](`[${level}] ${context} ${line}`);
}
export const logger = {
  error: (c: string, m: unknown) => log("error", c, m),
  warn: (c: string, m: unknown) => log("warn", c, m),
  info: (c: string, m: unknown) => log("info", c, m),
  debug: (c: string, m: unknown) => log("debug", c, m),
};
