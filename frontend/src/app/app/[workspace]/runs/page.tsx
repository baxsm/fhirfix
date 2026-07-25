import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";
import { RunsView } from "./runs-view";

export default async function RunsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;

  // resolve the slug to an id ON THE SERVER, then prefetch the list with it.
  //
  // the client used to do this as a waterfall: mount -> fetch the workspace
  // list -> derive the id -> only then fetch the runs. three round trips before
  // a single row could render, which is why pages felt slow against a 13ms api.
  const workspaceId = await resolveWorkspace(workspace);
  if (workspaceId) {
    await prefetch(trpcServer.run.list.queryOptions({ workspaceId }));
  }

  return (
    <HydrateClient>
      <RunsView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
