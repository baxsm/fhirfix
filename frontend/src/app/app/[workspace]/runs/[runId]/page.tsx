import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { getServerQueryClient, HydrateClient, trpcServer } from "@/trpc/server";
import { RunReport } from "./run-report";

export default async function RunReportPage({
  params,
}: {
  params: Promise<{ workspace: string; runId: string }>;
}) {
  const { workspace, runId } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  let runMissing = false;
  if (workspaceId) {
    const queryClient = getServerQueryClient();
    try {
      await queryClient.fetchQuery(trpcServer.run.get.queryOptions({ workspaceId, runId }));
    } catch {
      queryClient.removeQueries({ queryKey: trpcServer.run.get.queryKey({ workspaceId, runId }) });
      runMissing = true;
    }
  }

  return (
    <HydrateClient>
      <RunReport
        workspace={workspace}
        workspaceId={workspaceId}
        runId={runId}
        runMissing={runMissing}
      />
    </HydrateClient>
  );
}
