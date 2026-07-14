import { SettingsView } from "./settings-view";

export default async function SettingsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return <SettingsView workspace={workspace} />;
}
