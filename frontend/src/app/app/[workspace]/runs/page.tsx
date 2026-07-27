import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";
import { RunsView } from "./runs-view";

export default async function RunsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;

  const workspaceId = await resolveWorkspace(workspace);
  if (workspaceId) {
    prefetch(trpcServer.run.list.queryOptions({ workspaceId }));
  }

  return (
    <HydrateClient>
      <RunsView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
