const sanitize = (str: string): string => str.replace(/\s+/g, " ").trim();

type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const getConfiguredLevel = (): LogLevel => {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw && raw in LOG_LEVEL_PRIORITY) return raw as LogLevel;
  return "info";
};

const shouldLog = (level: LogLevel): boolean =>
  LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[getConfiguredLevel()];

const formatDetails = (data: string | string[] | unknown): string => {
  if (Array.isArray(data)) {
    return `Details: ${sanitize(data.join(" | "))}`;
  }
  if (data instanceof Error) {
    return `${data.name}: ${sanitize(data.message)}`;
  }
  if (typeof data === "object" && data !== null) {
    const objectDetails = Object.entries(data)
      .map(([key, value]) => `${key}: ${sanitize(String(value))}`)
      .join(" | ");
    return `Details: ${objectDetails}`;
  }
  return `Details: ${sanitize(String(data))}`;
};

const error = (path: string, detail: string | string[] | unknown) => {
  if (!shouldLog("error")) return;
  console.error(`[ERROR] Path: ${path} | ${formatDetails(detail)}`);
};

const warn = (path: string, detail: string | string[] | unknown) => {
  if (!shouldLog("warn")) return;
  console.warn(`[WARN] Path: ${path} | ${formatDetails(detail)}`);
};

const info = (path: string, detail: string | string[] | unknown) => {
  if (!shouldLog("info")) return;
  console.info(`[INFO] Path: ${path} | ${formatDetails(detail)}`);
};

const debug = (path: string, detail: string | string[] | unknown) => {
  if (!shouldLog("debug")) return;
  console.debug(`[DEBUG] Path: ${path} | ${formatDetails(detail)}`);
};

export const logger = { error, warn, info, debug };
