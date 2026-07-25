import { MappingsView } from "@/components/mappings/mappings-view";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";

export default async function MappingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    prefetch(trpcServer.mappings.counts.queryOptions({ workspaceId }));
    // the table opens on "suggested" when there are any and "active" otherwise,
    // and that decision is made client-side from the counts. prefetch both so
    // whichever it lands on is already there.
    prefetch(trpcServer.mappings.list.queryOptions({ workspaceId, status: "suggested" }));
    prefetch(trpcServer.mappings.list.queryOptions({ workspaceId, status: "active" }));
  }

  return (
    <HydrateClient>
      <MappingsView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
