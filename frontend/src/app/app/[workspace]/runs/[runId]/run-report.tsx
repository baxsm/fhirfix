"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/dashboard/page-container";
import { ReportView } from "@/components/report/report-view";
import { useListOrganizations } from "@/lib/auth-client";

export function RunReport({
  workspace,
  workspaceId: serverWorkspaceId,
  runId,
}: {
  workspace: string;
  workspaceId?: string;
  runId: string;
}) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

  // `full` because the diff IS the product output. this page used to carry its
  // own `mx-auto max-w-5xl`, which is why it lined up with no other screen and
  // why the diff had ~200px in which to render a url.
  return (
    <PageContainer width="full">
      <Link
        href={`/app/${workspace}/runs`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        All runs
      </Link>
      {/* no grey block while the workspace resolves - the server already knows
          it, and on a client navigation the org list is in cache by now. */}
      {workspaceId ? (
        <ReportView workspaceId={workspaceId} runId={runId} workspace={workspace} />
      ) : null}
    </PageContainer>
  );
}
