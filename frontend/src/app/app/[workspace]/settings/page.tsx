import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { HydrateClient, prefetch, trpcServer } from "@/trpc/server";
import { SettingsView } from "./settings-view";

export default async function SettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  if (workspaceId) {
    prefetch(trpcServer.workspace.get.queryOptions({ workspaceId }));
    prefetch(trpcServer.member.list.queryOptions({ workspaceId }));
  }

  return (
    <HydrateClient>
      <SettingsView workspace={workspace} workspaceId={workspaceId} />
    </HydrateClient>
  );
}
