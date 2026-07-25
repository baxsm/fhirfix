import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";
import { RunReport } from "./run-report";

export default async function RunReportPage({
  params,
}: {
  params: Promise<{ workspace: string; runId: string }>;
}) {
  const { workspace, runId } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  // the report is the page that most needed this: it used to render a grey
  // pulse block until the client resolved the workspace, THEN fetch the run.
  // that wait was our own waterfall, not the engine - runs average 1.33s and
  // the report is being read after the run is already done.
  if (workspaceId) {
    prefetch(trpcServer.run.get.queryOptions({ workspaceId, runId }));
  }

  return (
    <HydrateClient>
      <RunReport workspace={workspace} workspaceId={workspaceId} runId={runId} />
    </HydrateClient>
  );
}
