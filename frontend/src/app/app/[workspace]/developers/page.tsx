import { DevelopersView } from "@/components/developers/developers-view";

export default async function DevelopersPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <DevelopersView workspace={workspace} />;
}
