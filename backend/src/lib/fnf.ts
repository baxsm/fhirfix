import { logger } from "./logger";

export function fnf(work: Promise<unknown> | (() => Promise<unknown>), name: string): void {
  const p = typeof work === "function" ? work() : work;
  Promise.resolve(p).catch((error) => logger.error(name, error));
}
