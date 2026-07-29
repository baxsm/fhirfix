"use client";

import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditView } from "./audit-view";

export function AuditPageView({ workspaceId }: { workspaceId: string | null }) {
  return (
    <PageContainer>
      <PageHeader
        title="Audit log"
        description="Who changed what, and when. Entries are written as they happen and cannot be edited or removed."
      />

      <section className="raised overflow-hidden rounded-lg border bg-card">
        <div className="px-4 py-3.5">
          {workspaceId ? (
            <AuditView workspaceId={workspaceId} />
          ) : (
            <Skeleton className="h-[585px] w-full" />
          )}
        </div>
      </section>
    </PageContainer>
  );
}
