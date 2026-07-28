"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, SlidersHorizontal, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/dashboard/page-container";
import { SettingRow, SettingsSection } from "@/components/dashboard/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrganizations } from "@/lib/auth-client";
import { can, type WorkspaceRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { MembersSection } from "./members-section";

type SectionId = "members" | "defaults";

const SECTIONS: { id: SectionId; label: string; icon: typeof Users; hint: string }[] = [
  { id: "members", label: "Members", icon: Users, hint: "People and roles" },
  { id: "defaults", label: "Defaults", icon: SlidersHorizontal, hint: "PHI and retention" },
];

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
  const [section, setSection] = useState<SectionId>("members");

  return (
    <PageContainer>
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Members, roles, and defaults for{" "}
          <span className="font-medium text-foreground">{active?.name ?? "this workspace"}</span>.
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[180px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {SECTIONS.map((s) => {
            const activeSection = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                aria-current={activeSection}
                className={cn(
                  "relative flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors md:w-full",
                  activeSection
                    ? "bg-foreground/[0.07] font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <s.icon
                  className={cn("size-4", activeSection ? "text-foreground" : "opacity-70")}
                />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {section === "members" && (
            <SettingsSection
              title="Members"
              description="Invite teammates and manage their roles in this workspace."
            >
              {workspaceId ? (
                <MembersSection workspaceId={workspaceId} role={role} />
              ) : (
                <Skeleton className="h-40 w-full" />
              )}
            </SettingsSection>
          )}

          {section === "defaults" && (
            <SettingsSection
              title="Workspace defaults"
              description="How this workspace handles PHI and how long it keeps run data."
            >
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
              <SettingRow
                label="Notifications"
                hint="Run and alert emails use these workspace defaults."
                muted
              >
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bell className="size-3.5" />
                  Configured per workspace
                </span>
              </SettingRow>
            </SettingsSection>
          )}
        </div>
      </div>
    </PageContainer>
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
      <SettingRow
        label="PHI redaction policy"
        hint="Controls whether protected health information is stripped before storage."
      >
        <Select
          value={redactionPolicy}
          onValueChange={(v) => setRedaction(v as typeof redactionPolicy)}
          disabled={!canEdit}
        >
          <SelectTrigger id="redaction" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Off</SelectItem>
            <SelectItem value="on_ingest">Redact on ingest</SelectItem>
            <SelectItem value="required">Required (never store PHI)</SelectItem>
          </SelectContent>
        </Select>
      </SettingRow>

      <SettingRow
        label="Data retention"
        hint="How many days runs and findings are kept before automatic deletion."
      >
        <div className="flex items-center gap-2">
          <Input
            id="retention"
            type="number"
            min={1}
            max={3650}
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
            disabled={!canEdit}
            className="w-24 tabular-nums"
          />
          <span className="text-sm text-muted-foreground">days</span>
        </div>
      </SettingRow>

      {canEdit && (
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save defaults"}
          </Button>
        </div>
      )}
    </form>
  );
}
