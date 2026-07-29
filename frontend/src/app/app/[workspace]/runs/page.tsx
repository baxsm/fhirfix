import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";
import { RunsView } from "./runs-view";

export default async function RunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { workspace } = await params;
  const { status } = await searchParams;

  const workspaceId = await resolveWorkspace(workspace);
  if (workspaceId) {
    prefetch(trpcServer.run.list.queryOptions({ workspaceId }));
  }

  return (
    <HydrateClient>
      <RunsView
        workspace={workspace}
        workspaceId={workspaceId}
        initialFailedOnly={status === "failed"}
      />
    </HydrateClient>
  );
}
