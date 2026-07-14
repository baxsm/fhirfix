"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReportView } from "@/components/report/report-view";
import { useListOrganizations } from "@/lib/auth-client";

export function RunReport({ workspace, runId }: { workspace: string; runId: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link
        href={`/app/${workspace}/runs`}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-3.5" />
        All runs
      </Link>
      {workspaceId ? (
        <ReportView workspaceId={workspaceId} runId={runId} />
      ) : (
        <div className="h-64 animate-pulse rounded-md bg-muted" />
      )}
    </div>
  );
}
