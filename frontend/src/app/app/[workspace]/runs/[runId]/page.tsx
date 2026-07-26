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

  // the report is the page that most needed server-side data: it used to render
  // a grey pulse block until the client resolved the workspace, THEN fetch the
  // run. that wait was our own waterfall, not the engine.
  //
  // this AWAITS rather than firing and forgetting. `prefetch` wraps
  // `prefetchQuery`, which never rejects, and query-client.ts dehydrates
  // PENDING queries so streaming works - so a run id that did not resolve
  // arrived on the client as a query stuck pending forever. it never refetched,
  // isError never became true, and the report sat on its skeleton for good.
  // awaiting costs the stream on this one page and buys a real not-found.
  let runMissing = false;
  if (workspaceId) {
    const queryClient = getServerQueryClient();
    try {
      await queryClient.fetchQuery(trpcServer.run.get.queryOptions({ workspaceId, runId }));
    } catch {
      // remove the failed entry so it does not dehydrate as a pending query
      // that the client will wait on forever.
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
