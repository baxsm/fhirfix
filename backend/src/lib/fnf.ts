import { logger } from "./logger";

// fire and forget. runs a promise (or thunk) without awaiting, catching + logging
// errors so a non-critical side effect never crashes the request. drizzle query
// builders are thenables, so a query can be passed directly.
export function fnf(work: Promise<unknown> | (() => Promise<unknown>), name: string): void {
  const p = typeof work === "function" ? work() : work;
  Promise.resolve(p).catch((error) => logger.error(name, error));
}
