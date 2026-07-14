import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <DashboardShell workspace={workspace}>{children}</DashboardShell>;
}
