import { RunsView } from "./runs-view";

export default async function RunsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <RunsView workspace={workspace} />;
}
