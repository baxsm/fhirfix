"use client";

import { PageContainer } from "@/components/dashboard/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditView } from "./audit-view";

export function AuditPageView({ workspaceId }: { workspaceId: string | null }) {
  return (
    <PageContainer>
      <header className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Who changed what, and when. Entries are written as they happen and cannot be edited or
          removed.
        </p>
      </header>

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
