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
