import { RunReport } from "./run-report";

export default async function RunReportPage({
  params,
}: {
  params: Promise<{ workspace: string; runId: string }>;
}) {
  const { workspace, runId } = await params;
  return <RunReport workspace={workspace} runId={runId} />;
}
