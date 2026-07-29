import { resolveWorkspace } from "@/trpc/resolve-workspace";
import { CheckView } from "./check-view";

export default async function CheckPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  const workspaceId = await resolveWorkspace(workspace);

  return <CheckView workspace={workspace} workspaceId={workspaceId} />;
}
