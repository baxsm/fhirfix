import { MonitoringView } from "@/components/monitoring/monitoring-view";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";

export default async function MonitoringPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    prefetch(trpcServer.monitoring.listChecks.queryOptions({ workspaceId }));
    prefetch(trpcServer.monitoring.alertCounts.queryOptions({ workspaceId }));
    // the page opens on Checks, but the alert count sits on the other tab, so
    // the feed's default query is prefetched too and switching is instant.
    prefetch(
      trpcServer.monitoring.listAlerts.queryOptions({ workspaceId, unacknowledgedOnly: true }),
    );
  }

  return (
    <HydrateClient>
      <MonitoringView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
