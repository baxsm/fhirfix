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
  runMissing,
}: {
  workspace: string;
  workspaceId?: string;
  runId: string;
  // the server already tried to fetch this run and could not.
  runMissing?: boolean;
}) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

  return (
    <PageContainer width="full">
      <Link
        href={`/app/${workspace}/runs`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        All runs
      </Link>
      {/* no grey block while the workspace resolves - the server already knows it, and on a client */}
      {workspaceId ? (
        <ReportView
          workspaceId={workspaceId}
          runId={runId}
          workspace={workspace}
          runMissing={runMissing}
        />
      ) : null}
    </PageContainer>
  );
}
