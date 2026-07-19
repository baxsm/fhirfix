import { MappingsView } from "@/components/mappings/mappings-view";

export default async function MappingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <MappingsView workspace={workspace} />;
}
