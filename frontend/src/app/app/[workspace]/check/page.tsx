import { CheckView } from "./check-view";

export default async function CheckPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <CheckView workspace={workspace} />;
}
