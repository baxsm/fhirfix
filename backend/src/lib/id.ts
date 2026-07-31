import { customAlphabet } from "nanoid";

// url-safe, unambiguous alphabet (no look-alike chars)
const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);

// prefixes make ids self-describing in logs and urls
export const idPrefix = {
  workspaceSettings: "wss",
  run: "run",
  finding: "fnd",
  mapping: "map",
  apiKey: "key",
  ledger: "led",
  invoice: "inv",
  packet: "pkt",
  evidence: "evd",
  secret: "sec",
  scheduledCheck: "sch",
  driftAlert: "drf",
  webhook: "whk",
  reportShare: "shr",
  storedObject: "obj",
  apiRequestLog: "areq",
  notification: "ntf",
  audit: "aud",
  ssoProvider: "sso",
} as const;

type IdKind = keyof typeof idPrefix;

export function createId(kind: IdKind): string {
  return `${idPrefix[kind]}_${nano()}`;
}
