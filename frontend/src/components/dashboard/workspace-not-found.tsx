"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useListOrganizations } from "@/lib/auth-client";

// a bad /app/[workspace] slug shows this, not a raw 404 (pages.md).
export function WorkspaceNotFound() {
  const router = useRouter();
  const { data: orgs } = useListOrganizations();
  const first = orgs?.[0];

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Workspace not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This workspace does not exist or you no longer have access to it.
        </p>
      </div>
      <div className="flex gap-2">
        {first ? (
          <Button onClick={() => router.push(`/app/${first.slug}`)}>Go to {first.name}</Button>
        ) : (
          <Button onClick={() => router.push("/app/new")}>Create a workspace</Button>
        )}
        <Button variant="outline" onClick={() => router.push("/app")}>
          Switch workspace
        </Button>
      </div>
    </div>
  );
}
