"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Palette, SlidersHorizontal, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
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

type SectionId = "members" | "defaults" | "appearance";

const SECTIONS: { id: SectionId; label: string; icon: typeof Users; hint: string }[] = [
  { id: "members", label: "Members", icon: Users, hint: "People and roles" },
  { id: "defaults", label: "Defaults", icon: SlidersHorizontal, hint: "PHI and retention" },
  { id: "appearance", label: "Appearance", icon: Palette, hint: "Theme for this device" },
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
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Members, roles, defaults, and appearance for{" "}
          <span className="font-medium text-foreground">{active?.name ?? "this workspace"}</span>.
        </p>
      </header>

      {/* settings sub-nav on the left, content on the right. every section renders
          inside the same SettingsSection frame so a small section (appearance) is
          as structured as a big one (members) — no more stranded tiny panels. */}
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
                    ? "bg-primary/10 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                {/* emerald left accent, same active language as the app sidebar */}
                {activeSection && (
                  <span className="absolute inset-y-1.5 left-0 hidden w-0.5 rounded-full bg-primary md:block" />
                )}
                <s.icon className={cn("size-4", activeSection ? "text-primary" : "opacity-70")} />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {section === "members" && (
            <SettingsSection
              icon={Users}
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
              icon={SlidersHorizontal}
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
            </SettingsSection>
          )}

          {section === "appearance" && (
            <SettingsSection
              icon={Palette}
              title="Appearance"
              description="Theme applies to your account on this device only."
            >
              <SettingRow label="Theme" hint="Switch between light, dark, or your system setting.">
                <ThemeToggle />
              </SettingRow>
              <SettingRow
                label="Notifications"
                hint="Run and alert emails arrive with your workspace defaults."
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
    </div>
  );
}

// shared frame: a titled panel with a consistent header and body. one bordered
// container per section, dividers inside for grouping (no card-in-card).
function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Users;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="raised overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start gap-3 border-b px-5 py-4">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div className="space-y-0.5">
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

// a labelled setting row: description on the left, control on the right. keeps
// small controls (a toggle) from looking stranded in a big empty panel.
function SettingRow({
  label,
  hint,
  muted,
  children,
}: {
  label: string;
  hint: string;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between [&:not(:last-child)]:border-b">
      <div className="space-y-0.5">
        <p className={cn("text-sm font-medium", muted && "text-muted-foreground")}>{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
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
