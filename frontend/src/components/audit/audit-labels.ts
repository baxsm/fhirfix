// read by a person answering an auditor, so actions read as words
export const ACTION_LABELS: Record<string, string> = {
  login: "Signed in",
  "run.created": "Ran a check",
  "run.cancelled": "Cancelled a run",
  "report.downloaded": "Downloaded a report",
  "report.exported": "Exported a report",
  "mapping.changed": "Changed a mapping",
  "mapping.approved": "Approved a mapping",
  "mapping.deprecated": "Deprecated a mapping",
  "mapping.imported": "Imported mappings",
  "key.created": "Created an API key",
  "key.revoked": "Revoked an API key",
  "webhook.created": "Created a webhook",
  "webhook.secret_rotated": "Rotated a webhook secret",
  "webhook.deleted": "Deleted a webhook",
  "member.invited": "Invited a member",
  "member.role_changed": "Changed a member role",
  "member.removed": "Removed a member",
  "settings.changed": "Changed workspace settings",
  "billing.checkout_started": "Started a checkout",
  "billing.auto_recharge_changed": "Changed auto-recharge",
  "billing.spend_cap_changed": "Changed the spend cap",
  "check.created": "Created a scheduled check",
  "check.changed": "Changed a scheduled check",
  "check.deleted": "Deleted a scheduled check",
  "packet.launched": "Launched a conformance packet",
  "packet.exported": "Exported an evidence packet",
  "data.exported": "Exported data",
  "baa.requested": "Requested a BAA",
  "sso.configured": "Configured single sign-on",
  "sso.removed": "Removed single sign-on",
  "scim.enabled": "Enabled directory sync",
  "scim.disabled": "Disabled directory sync",
  "workspace.deleted": "Deleted the workspace",
};

type ActorFields = {
  actorType: "user" | "api_key" | "system";
  actorId: string | null;
  actorName?: string | null;
};

export function actorLabel(row: ActorFields): string {
  if (row.actorType === "system") return "System";
  // fall back to the opaque id only when the actor no longer exists
  if (row.actorName) {
    return row.actorType === "api_key" ? `${row.actorName} (API key)` : row.actorName;
  }
  if (row.actorType === "api_key") return "Deleted API key";
  return row.actorId ? "Removed user" : "Unknown";
}

type TargetFields = {
  targetRef: string | null;
  workspaceId: string;
  metadata: Record<string, unknown> | null;
};

export function targetLabel(row: TargetFields): string {
  // the whole page is one workspace, so naming it again in every row says nothing
  if (row.targetRef && row.targetRef !== row.workspaceId) return row.targetRef;
  const changed = row.metadata?.changed;
  if (Array.isArray(changed) && changed.length > 0) return changed.join(", ");
  const kind = row.metadata?.kind;
  if (typeof kind === "string") return kind;
  return "—";
}
