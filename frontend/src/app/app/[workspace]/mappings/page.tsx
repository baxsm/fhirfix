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

  // which tab to open on is decided HERE, not in the client. the counts are
  // already being fetched on this request, so awaiting them costs nothing extra
  // and lets the first paint be correct. deciding it client-side meant the page
  // rendered "Active", then flipped to "Suggestions" once the query resolved -
  // a visible switch under the pointer on every load.
  let initialStatus: "active" | "suggested" = "active";
  const queryClient = getServerQueryClient();

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    prefetch(trpcServer.mappings.counts.queryOptions({ workspaceId }));

    const counts = await serverApi.mappings.counts.query({ workspaceId }).catch(() => null);
    if (counts && counts.suggested > 0) initialStatus = "suggested";

    // AWAITED, unlike the others. prefetch() streams by design, so at first
    // paint the client query is still pending and the table renders its
    // skeleton over rows that are already in the payload. awaiting the one list
    // actually on screen costs a few ms and removes the flash entirely.
    // the other statuses stay lazy - they load when the user switches tab.
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
