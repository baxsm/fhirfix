"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

interface Props {
  // the modal passes a close handler; the onboarding page leaves it out.
  onClose?: () => void;
  // where to focus first; the modal autofocuses, the page does too.
  autoFocus?: boolean;
  // the modal renders its own footer via DialogFooter; the page renders inline.
  layout?: "page" | "modal";
}

export function CreateWorkspaceForm({ onClose, autoFocus = true, layout = "page" }: Props) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const create = useMutation(
    trpc.workspace.create.mutationOptions({
      onSuccess: async (org) => {
        toast.success("Workspace created");
        await queryClient.invalidateQueries({ queryKey: trpc.workspace.list.queryKey() });
        // the org is created server-side via trpc, so better-auth's $listOrg stays stale without this
        authClient.$store.notify("$listOrg");
        onClose?.();
        router.push(`/app/${org.slug}`);
      },
      onError: (e) => {
        setNavigating(false);
        toast.error(e.message ?? "Could not create the workspace.");
      },
    }),
  );

  const effectiveSlug = slugEdited ? slug : slugify(name);
  const pending = create.isPending || navigating;
  const canSubmit = Boolean(name.trim() && effectiveSlug) && !pending;

  const submit = () => {
    if (!canSubmit) return;
    setNavigating(true);
    create.mutate({ name, slug: effectiveSlug });
  };

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ws-name">Workspace name</Label>
        <Input
          id="ws-name"
          placeholder="Northwind Health"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ws-slug">URL</Label>
        <div className="flex items-center rounded-md border bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20">
          <span className="pl-3 font-mono text-xs text-muted-foreground/70 select-none">/app/</span>
          <input
            id="ws-slug"
            value={effectiveSlug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="northwind-health"
            autoComplete="off"
            className="w-full bg-transparent py-2 pr-3 pl-0.5 font-mono text-sm outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Used in the workspace URL and API paths. Lowercase, no spaces.
        </p>
      </div>

      {layout === "page" ? (
        <Button type="submit" className="w-full" disabled={!canSubmit}>
          {pending ? "Creating..." : "Create workspace"}
        </Button>
      ) : (
        <div className="-mx-4 -mb-4 flex justify-end gap-2 rounded-b-lg border-t bg-muted/40 p-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {pending ? "Creating..." : "Create workspace"}
          </Button>
        </div>
      )}
    </form>
  );
}
