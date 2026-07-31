"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  DatabaseBackup,
  Download,
  FileSignature,
  KeyRound,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/dashboard/page-container";
import { PageHeader } from "@/components/dashboard/page-header";
import { SettingRow, SettingsSection } from "@/components/dashboard/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NavRow } from "@/components/ui/nav-row";
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
import { SsoSection } from "./sso-section";

type SectionId = "members" | "defaults" | "sso" | "data";

const SECTIONS: { id: SectionId; label: string; icon: typeof Users; hint: string }[] = [
  { id: "members", label: "Members", icon: Users, hint: "People and roles" },
  { id: "defaults", label: "Defaults", icon: SlidersHorizontal, hint: "PHI and retention" },
  { id: "sso", label: "Single sign-on", icon: KeyRound, hint: "SAML identity provider" },
  { id: "data", label: "Data", icon: DatabaseBackup, hint: "Export and deletion" },
];

export function SettingsView({
  workspace,
  workspaceId: serverWorkspaceId,
}: {
  workspace: string;
  workspaceId?: string;
}) {
  const { data: orgs } = useListOrganizations();
  const active = orgs?.find((o) => o.slug === workspace || o.id === workspace);
  const workspaceId = serverWorkspaceId || active?.id || "";

  const trpc = useTRPC();
  const wsQuery = useQuery({
    ...trpc.workspace.get.queryOptions({ workspaceId }),
    enabled: !!workspaceId,
  });

  const role = (wsQuery.data?.role ?? "member") as WorkspaceRole;
  const [section, setSection] = useState<SectionId>("members");

  return (
    <PageContainer>
      <PageHeader title="Settings" description="Members, roles, and defaults for this workspace." />

      <div className="grid gap-8 md:grid-cols-[180px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {SECTIONS.map((s) => {
            const activeSection = section === s.id;
            return (
              <NavRow
                key={s.id}
                active={activeSection}
                onClick={() => setSection(s.id)}
                className="w-auto shrink-0 py-2 md:w-full"
              >
                <s.icon className={cn("size-4", !activeSection && "opacity-70")} />
                {s.label}
              </NavRow>
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

              {/* a request to a person, not a saved default, so it sits after
                  the form rather than under its save button. */}
              {!wsQuery.isPending && (
                <BaaRow
                  workspaceId={workspaceId}
                  canRequest={can(role, "workspaceSettings", "update")}
                  status={wsQuery.data?.settings?.baaStatus ?? "none"}
                />
              )}
              {/* these emails go to a person, not a workspace, so the control
                  lives on the account. this row only points at it. */}
              <SettingRow
                label="Notifications"
                hint="Billing emails are sent to you personally, not to the workspace."
                muted
              >
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  <Bell className="size-3.5" />
                  Account settings
                </Link>
              </SettingRow>
            </SettingsSection>
          )}

          {section === "sso" && (
            <SettingsSection
              title="Single sign-on"
              description="Let your team sign in through your own SAML identity provider."
            >
              <SsoSection workspaceId={workspaceId} isOwner={role === "owner"} />
            </SettingsSection>
          )}

          {section === "data" && (
            <SettingsSection
              title="Export and deletion"
              description="Take your data with you, or remove this workspace entirely."
            >
              <DataSection
                workspaceId={workspaceId}
                workspaceSlug={active?.slug ?? workspace}
                workspaceName={active?.name ?? workspace}
                canExport={can(role, "workspaceSettings", "update")}
                isOwner={role === "owner"}
              />
            </SettingsSection>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

// sits outside the defaults form on purpose: it is a request to a person, not a
// setting you save, and nesting it would submit the form.
function BaaRow({
  workspaceId,
  canRequest,
  status,
}: {
  workspaceId: string;
  canRequest: boolean;
  status: "none" | "requested" | "signed";
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const request = useMutation(
    trpc.workspace.requestBaa.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.workspace.get.queryKey({ workspaceId }),
        });
        toast.success("BAA requested. We will email you the agreement.");
      },
      onError: (e) => toast.error(e.message ?? "Could not send the request."),
    }),
  );

  const hint =
    status === "signed"
      ? "A signed agreement covers PHI processed in this workspace."
      : status === "requested"
        ? "We received the request and will email the agreement to you."
        : "Required before you send PHI. We email the agreement to countersign.";

  return (
    <SettingRow label="Business Associate Agreement" hint={hint}>
      {status === "none" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={!canRequest || request.isPending}
          onClick={() => request.mutate({ workspaceId })}
        >
          <FileSignature className="size-3.5" />
          {request.isPending ? "Sending..." : "Request a BAA"}
        </Button>
      ) : status === "signed" ? (
        <Badge
          variant="outline"
          className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400"
        >
          <Check className="size-3" />
          Signed
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Requested
        </Badge>
      )}
    </SettingRow>
  );
}

function DataSection({
  workspaceId,
  workspaceSlug,
  workspaceName,
  canExport,
  isOwner,
}: {
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  canExport: boolean;
  isOwner: boolean;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");

  // fetched on demand through the client rather than a disabled useQuery:
  // refetch() on a disabled query is a no-op in react-query v5, so the button
  // would silently do nothing.
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);

  const runExport = async () => {
    setExporting(true);
    try {
      const data = await queryClient.fetchQuery(
        trpc.workspace.exportData.queryOptions({ workspaceId }),
      );
      const body = `${JSON.stringify(data, null, 2)}\n`;
      const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${workspaceSlug}-export.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      toast.error("Could not build the export.");
    } finally {
      setExporting(false);
    }
  };

  const remove = useMutation(
    trpc.workspace.delete.mutationOptions({
      onSuccess: () => {
        toast.success(`${workspaceName} was deleted.`);
        // the workspace this page belongs to no longer exists.
        router.replace("/app");
      },
      onError: (e) => toast.error(e.message ?? "Could not delete the workspace."),
    }),
  );

  return (
    <>
      <SettingRow
        label="Export workspace data"
        hint="Runs, findings, mappings, ledger, and the audit trail as one JSON file."
      >
        <Button variant="outline" size="sm" disabled={!canExport || exporting} onClick={runExport}>
          <Download className="size-3.5" />
          {exporting ? "Preparing..." : "Export"}
        </Button>
      </SettingRow>

      <SettingRow
        label="Delete this workspace"
        hint="Removes every run, finding, and stored file. Billing records and the audit trail are kept, detached from the workspace."
      >
        <Button
          variant="destructive"
          size="sm"
          disabled={!isOwner}
          onClick={() => {
            setTyped("");
            setConfirmOpen(true);
          }}
        >
          Delete workspace
        </Button>
      </SettingRow>
      {!isOwner && (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          Only an owner can delete a workspace.
        </p>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {workspaceName}?</DialogTitle>
            <DialogDescription>
              This cannot be undone. Every run, finding, mapping, API key, and stored file in this
              workspace is deleted immediately, and all members lose access.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Your billing records and audit trail are kept for accounting and compliance, detached
            from the workspace and stripped of who did what.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-slug">
              Type <span className="font-mono text-foreground">{workspaceSlug}</span> to confirm
            </Label>
            <Input
              id="confirm-slug"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="font-mono"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={typed !== workspaceSlug || remove.isPending}
              onClick={() => remove.mutate({ workspaceId, confirmSlug: typed })}
            >
              {remove.isPending ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save defaults"}
          </Button>
        </div>
      )}
    </form>
  );
}
