import { createBlobStore } from "@fhirfix/db/blob";
import { env } from "./env";

// the workspace-scoped local blob store. object keys are namespaced by workspace
// so retention + hard-delete jobs can sweep per workspace later.
export const blobStore = createBlobStore(env.BLOB_STORE_DIR);

export function blobKey(workspaceId: string, runId: string, kind: "input" | "corrected"): string {
  return `${workspaceId}/${runId}/${kind}.json`;
}
