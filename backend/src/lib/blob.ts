import { createBlobStore } from "@shared/db/blob";
import { db } from "./db";

// the workspace-scoped blob store. object keys are namespaced by workspace so
// retention + hard-delete jobs can sweep per workspace later.
export const blobStore = createBlobStore(db);

export function blobKey(workspaceId: string, runId: string, kind: "input" | "corrected"): string {
  return `${workspaceId}/${runId}/${kind}.json`;
}
