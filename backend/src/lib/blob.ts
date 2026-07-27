import { createBlobStore } from "@shared/db/blob";
import { db } from "./db";

export const blobStore = createBlobStore(db);

export function blobKey(workspaceId: string, runId: string, kind: "input" | "corrected"): string {
  return `${workspaceId}/${runId}/${kind}.json`;
}
