"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListOrganizations } from "@/lib/auth-client";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { useTRPC } from "@/trpc/client";
import { MembersSection } from "./members-section";

export function SettingsView({ workspace }: { workspace: string }) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = active?.id ?? "";

  const trpc = useTRPC();
  const wsQuery = useQuery({
    ...trpc.workspace.get.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const role = (wsQuery.data?.role ?? "member") as WorkspaceRole;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace settings</h1>
        <p className="text-sm text-muted-foreground">
          Members, roles, defaults, and appearance for {active?.name ?? "this workspace"}.
        </p>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="pt-4">
          {workspaceId ? (
            <MembersSection workspaceId={workspaceId} role={role} />
          ) : (
            <Skeleton className="h-40 w-full" />
          )}
        </TabsContent>

        <TabsContent value="defaults" className="pt-4">
          {wsQuery.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <DefaultsSection
              workspaceId={workspaceId}
              canEdit={can(role, "workspaceSettings", "update")}
              initial={{
                redactionPolicy: wsQuery.data?.settings?.redactionPolicy ?? "on_ingest",
                dataRetentionDays: wsQuery.data?.settings?.dataRetentionDays ?? 30,
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="appearance" className="space-y-3 pt-4">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <p className="text-sm text-muted-foreground">Applies to your account on this device.</p>
          </div>
          <ThemeToggle />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DefaultsSection({
  workspaceId,
  canEdit,
  initial,
}: {
  workspaceId: string;
  canEdit: boolean;
  initial: { redactionPolicy: "off" | "on_ingest" | "required"; dataRetentionDays: number };
}) {
  const trpc = useTRPC();
  const [redactionPolicy, setRedaction] = useState(initial.redactionPolicy);
  const [retention, setRetention] = useState(String(initial.dataRetentionDays));

  useEffect(() => {
    setRedaction(initial.redactionPolicy);
    setRetention(String(initial.dataRetentionDays));
  }, [initial.redactionPolicy, initial.dataRetentionDays]);

  const save = useMutation(
    trpc.workspace.updateSettings.mutationOptions({
      onSuccess: () => toast.success("Defaults saved"),
      onError: (e) => toast.error(e.message ?? "Could not save defaults."),
    }),
  );

  return (
    <form
      className="max-w-md space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          workspaceId,
          redactionPolicy,
          dataRetentionDays: Number(retention),
        });
      }}
      noValidate
    >
      <div className="space-y-1.5">
        <Label htmlFor="redaction">PHI redaction policy</Label>
        <Select
          value={redactionPolicy}
          onValueChange={(v) => setRedaction(v as typeof redactionPolicy)}
          disabled={!canEdit}
        >
          <SelectTrigger id="redaction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="on_ingest">Redact on ingest</SelectItem>
            <SelectItem value="required">Required (never store PHI)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="retention">Data retention (days)</Label>
        <Input
          id="retention"
          type="number"
          min={1}
          max={3650}
          value={retention}
          onChange={(e) => setRetention(e.target.value)}
          disabled={!canEdit}
          className="w-32 tabular-nums"
        />
      </div>

      {canEdit && (
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save defaults"}
        </Button>
      )}
    </form>
  );
}
