import { LogsView } from "@/components/developers/logs-view";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";

export default async function LogsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    // the unfiltered first page, which is what the view opens on.
    prefetch(
      trpcServer.developers.requestLogs.list.queryOptions({
        workspaceId,
        method: undefined,
        onlyErrors: undefined,
        cursor: undefined,
        limit: 25,
      }),
    );
    prefetch(trpcServer.developers.requestLogs.stats.queryOptions({ workspaceId }));
  }

  return (
    <HydrateClient>
      <LogsView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
