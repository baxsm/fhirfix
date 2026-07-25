import "server-only";

import { cache } from "react";
import { serverApi } from "./server";

/**
 * slug (or id) from the url -> workspace id, resolved on the server.
 *
 * every view used to do this itself after mounting, via better-auth's
 * `useListOrganizations()`, which made the workspace list the head of a
 * waterfall: mount, fetch the list, derive the id, and only THEN fetch the
 * page's actual data. three sequential round trips before the first row.
 *
 * `cache` keys this to the react request scope, so a page that calls it and a
 * layout that calls it share one lookup rather than two.
 *
 * returns "" when the workspace is not found or the caller is signed out. the
 * caller renders its own not-found/empty state; this never throws, because a
 * bad slug in the url is a normal thing for a user to do.
 */
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
