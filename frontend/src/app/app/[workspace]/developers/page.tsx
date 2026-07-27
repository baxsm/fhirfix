import { DevelopersView } from "@/components/developers/developers-view";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    prefetch(trpcServer.developers.apiKeys.list.queryOptions({ workspaceId }));
    prefetch(trpcServer.developers.webhooks.list.queryOptions({ workspaceId }));
    prefetch(
      trpcServer.developers.requestLogs.list.queryOptions({
        workspaceId,
        method: undefined,
        onlyErrors: undefined,
        cursor: undefined,
        limit: 25,
      }),
    );
  }

  return (
    <HydrateClient>
      <DevelopersView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
