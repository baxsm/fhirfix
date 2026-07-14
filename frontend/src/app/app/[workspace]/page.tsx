import { OverviewView } from "./overview-view";

export default async function OverviewPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <OverviewView workspace={workspace} />;
}
