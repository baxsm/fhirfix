import { AuditPageView } from "@/components/audit/audit-page-view";
import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    // the unfiltered first page, which is what the view opens on.
    prefetch(
      trpcServer.audit.list.queryOptions({
        workspaceId,
        action: undefined,
        cursor: undefined,
        limit: 25,
      }),
    );
    prefetch(trpcServer.audit.actions.queryOptions({ workspaceId }));
  }

  return (
    <HydrateClient>
      <AuditPageView workspaceId={workspaceId} />
    </HydrateClient>
  );
}
