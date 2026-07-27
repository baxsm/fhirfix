import type { ApiKeyMode } from "@/lib/api-key";

export interface ApiV1Vars {
  apiKeyId: string;
  workspaceId: string;
  keyMode: ApiKeyMode;
  scopes: string[];
  // request accounting for the api_request_log row (written on every exit).
  startedAt: number;
  requestBytes: number;
  idempotencyKey: string | null;
  ip: string;
  // set by a controller when the call produced a run, so the log row links to it.
  runId: string | null;
  // a machine error code (rate_limited, out_of_credits, ...) for log filtering.
  errorCode: string | null;
}

// hono's Variables map for the api-v1 sub-app.
export type ApiV1Env = { Variables: ApiV1Vars };
