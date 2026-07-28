import { ConformanceView } from "@/components/conformance/conformance-view";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";

export default async function ConformancePage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    prefetch(trpcServer.conformance.list.queryOptions({ workspaceId }));
    prefetch(trpcServer.conformance.kits.queryOptions({ workspaceId }));
  }

  return (
    <HydrateClient>
      <ConformanceView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
