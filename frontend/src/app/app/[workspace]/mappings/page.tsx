import { MappingsView } from "@/components/mappings/mappings-view";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import {
  getServerQueryClient,
  HydrateClient,
  prefetch,
  serverApi,
  trpcServer,
} from "@/trpc/server";

export default async function MappingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  let initialStatus: "active" | "suggested" = "active";
  const queryClient = getServerQueryClient();

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    prefetch(trpcServer.mappings.counts.queryOptions({ workspaceId }));

    const counts = await serverApi.mappings.counts.query({ workspaceId }).catch(() => null);
    if (counts && counts.suggested > 0) initialStatus = "suggested";

    await queryClient.prefetchQuery(
      trpcServer.mappings.list.queryOptions({ workspaceId, status: initialStatus }),
    );
  }

  return (
    <HydrateClient>
      <MappingsView workspace={workspace} workspaceId={workspaceId} initialStatus={initialStatus} />
    </HydrateClient>
  );
}
