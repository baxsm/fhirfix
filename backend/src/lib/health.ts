import { getEngineDeps } from "@shared/engine/factory";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { redis } from "@/lib/redis";

// draft-inadarei-api-health-check-06; "warn" exists so a degraded pool does not page
export type CheckStatus = "pass" | "warn" | "fail";

export interface ComponentCheck {
  componentId: string;
  componentType: "datastore" | "component" | "system";
  status: CheckStatus;
  time: string;
  observedValue?: number;
  observedUnit?: string;
  output?: string;
}

export interface HealthReport {
  status: CheckStatus;
  description: string;
  checks: Record<string, ComponentCheck[]>;
}

const PROBE_TIMEOUT_MS = 5_000;
// the endpoint is public, so a caller must not become a sidecar probe
const CACHE_TTL_MS = 15_000;

let cached: { at: number; report: HealthReport } | undefined;

async function withTimeout<T>(work: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guard = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), PROBE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([work, guard]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// only the error name crosses the boundary; a driver message can carry the dsn
function safeOutput(err: unknown): string {
  if (err instanceof Error) return err.name;
  return "unknown error";
}

async function checkPostgres(): Promise<ComponentCheck> {
  const started = Date.now();
  const base = { componentId: "postgres", componentType: "datastore" as const };
  try {
    const probe = db.execute(sql`select 1`).then(() => true);
    const ok = await withTimeout(probe, false);
    return {
      ...base,
      status: ok ? "pass" : "fail",
      time: new Date().toISOString(),
      observedValue: Date.now() - started,
      observedUnit: "ms",
      ...(ok ? {} : { output: "timed out" }),
    };
  } catch (err) {
    return {
      ...base,
      status: "fail",
      time: new Date().toISOString(),
      output: safeOutput(err),
    };
  }
}

async function checkRedis(): Promise<ComponentCheck> {
  const started = Date.now();
  const base = { componentId: "redis", componentType: "datastore" as const };
  try {
    const probe = redis.ping().then((r) => r === "PONG");
    const ok = await withTimeout(probe, false);
    return {
      ...base,
      status: ok ? "pass" : "fail",
      time: new Date().toISOString(),
      observedValue: Date.now() - started,
      observedUnit: "ms",
      ...(ok ? {} : { output: "timed out" }),
    };
  } catch (err) {
    return {
      ...base,
      status: "fail",
      time: new Date().toISOString(),
      output: safeOutput(err),
    };
  }
}

async function checkValidator(): Promise<ComponentCheck> {
  const { deps } = getEngineDeps({
    validatorUrls: env.VALIDATOR_URL_LIST,
    validatorMaxInFlight: Number(env.VALIDATOR_MAX_INFLIGHT),
    converterUrl: env.CONVERTER_URL,
    usCoreVersion: env.US_CORE_VERSION,
  });
  const base = { componentId: "validator", componentType: "component" as const };
  const total = deps.validator.instanceCount;
  const ready = await withTimeout(
    deps.validator.probeAll().then((r) => r.readyCount),
    0,
  );
  const status = poolStatus(ready, total);
  return {
    ...base,
    status,
    time: new Date().toISOString(),
    observedValue: ready,
    observedUnit: "instances",
    ...(status === "pass" ? {} : { output: `${ready} of ${total} instances ready` }),
  };
}

async function checkConverter(): Promise<ComponentCheck> {
  const { deps } = getEngineDeps({
    validatorUrls: env.VALIDATOR_URL_LIST,
    validatorMaxInFlight: Number(env.VALIDATOR_MAX_INFLIGHT),
    converterUrl: env.CONVERTER_URL,
    usCoreVersion: env.US_CORE_VERSION,
  });
  const ok = await withTimeout(deps.converter.ready(), false);
  return {
    componentId: "converter",
    componentType: "component",
    status: ok ? "pass" : "fail",
    time: new Date().toISOString(),
    ...(ok ? {} : { output: "not reporting healthy" }),
  };
}

// a "warn" component must not roll up to "fail" and page someone
export function worst(statuses: CheckStatus[]): CheckStatus {
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "pass";
}

// a partial pool still serves runs, so it is degraded rather than down
export function poolStatus(ready: number, total: number): CheckStatus {
  if (ready === 0) return "fail";
  return ready < total ? "warn" : "pass";
}

export async function getHealthReport(force = false): Promise<HealthReport> {
  const now = Date.now();
  if (!force && cached && now - cached.at < CACHE_TTL_MS) return cached.report;

  const [postgres, redisCheck, validator, converter] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkValidator(),
    checkConverter(),
  ]);

  const report: HealthReport = {
    status: worst([postgres.status, redisCheck.status, validator.status, converter.status]),
    description: "fhirfix",
    checks: {
      "postgres:connection": [postgres],
      "redis:connection": [redisCheck],
      "validator:readiness": [validator],
      "converter:readiness": [converter],
    },
  };
  cached = { at: now, report };
  return report;
}

// tests need a clean slate between cases.
export function _resetHealthCache(): void {
  cached = undefined;
}
