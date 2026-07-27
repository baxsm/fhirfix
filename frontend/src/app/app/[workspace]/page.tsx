import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";
import { OverviewView } from "./overview-view";

export default async function OverviewPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.run.list.queryOptions({ workspaceId }));
    prefetch(trpcServer.run.trend.queryOptions({ workspaceId }));
    prefetch(trpcServer.mappings.counts.queryOptions({ workspaceId }));
  }

  return (
    <HydrateClient>
      <OverviewView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
