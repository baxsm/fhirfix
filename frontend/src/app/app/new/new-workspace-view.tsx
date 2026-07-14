"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function NewWorkspaceView() {
  const router = useRouter();
  const trpc = useTRPC();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const create = useMutation(
    trpc.workspace.create.mutationOptions({
      onSuccess: async (org) => {
        toast.success("Workspace created");
        // refetch the client org list so the shell sees the new workspace,
        // otherwise the dashboard renders "workspace not found" from stale cache.
        await authClient.organization.list();
        router.push(`/app/${org.slug}`);
      },
      onError: (e) => toast.error(e.message ?? "Could not create the workspace."),
    }),
  );

  const effectiveSlug = slugEdited ? slug : slugify(name);

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center p-6">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create a workspace</h1>
        <p className="text-sm text-muted-foreground">
          A workspace holds your runs, mappings, keys, and billing. You can create more later.
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!name || !effectiveSlug) return;
              create.mutate({ name, slug: effectiveSlug });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ws-name">Name</Label>
              <Input
                id="ws-name"
                placeholder="Acme Health"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ws-slug">URL slug</Label>
              <Input
                id="ws-slug"
                placeholder="acme-health"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                className="font-mono"
              />
              <p className="font-mono text-xs text-muted-foreground">
                /app/{effectiveSlug || "..."}
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={create.isPending || !name || !effectiveSlug}
            >
              {create.isPending ? "Creating..." : "Create workspace"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
