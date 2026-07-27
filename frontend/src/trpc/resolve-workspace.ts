import "server-only";

import { cache } from "react";
import { serverApi } from "./server";

export const resolveWorkspace = cache(async (slugOrId: string): Promise<string> => {
  try {
    const workspaces = await serverApi.workspace.list.query();
    const hit = workspaces.find(
      (w: { id: string; slug: string }) => w.slug === slugOrId || w.id === slugOrId,
    );
    return hit?.id ?? "";
  } catch {
    return "";
  }
});
