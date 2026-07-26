import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, ownerAc } from "better-auth/plugins/organization/access";

// MUST stay in sync with backend/src/auth/permissions.ts. the client access
// control has to match the server's for role checks to agree.
const statement = {
  ...defaultStatements,
  workspaceSettings: ["view", "update"],
  billing: ["view", "manage"],
  run: ["create", "view"],
  mapping: ["view", "create", "approve", "deprecate"],
  apiKey: ["view", "create", "revoke"],
  audit: ["view"],
  monitoring: ["view", "manage"],
} as const;

export const ac = createAccessControl(statement);

export const auditor = ac.newRole({
  workspaceSettings: ["view"],
  billing: ["view"],
  run: ["view"],
  mapping: ["view"],
  apiKey: ["view"],
  audit: ["view"],
  monitoring: ["view"],
});

export const billing = ac.newRole({
  workspaceSettings: ["view"],
  billing: ["view", "manage"],
  run: ["create", "view"],
  mapping: ["view"],
  apiKey: ["view"],
  monitoring: ["view"],
});

export const member = ac.newRole({
  workspaceSettings: ["view"],
  billing: ["view"],
  run: ["create", "view"],
  mapping: ["view", "create", "approve", "deprecate"],
  apiKey: ["view", "create", "revoke"],
  audit: ["view"],
  monitoring: ["view", "manage"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  workspaceSettings: ["view", "update"],
  billing: ["view", "manage"],
  run: ["create", "view"],
  mapping: ["view", "create", "approve", "deprecate"],
  apiKey: ["view", "create", "revoke"],
  audit: ["view"],
  monitoring: ["view", "manage"],
});

export const owner = ac.newRole({
  ...ownerAc.statements,
  workspaceSettings: ["view", "update"],
  billing: ["view", "manage"],
  run: ["create", "view"],
  mapping: ["view", "create", "approve", "deprecate"],
  apiKey: ["view", "create", "revoke"],
  audit: ["view"],
  monitoring: ["view", "manage"],
});

export const roles = { owner, admin, member, billing, auditor };
export type WorkspaceRole = keyof typeof roles;

// which nav items / actions each role can see. mirrors backend gating so the
// UI hides what the server would reject.
export function can(
  role: WorkspaceRole,
  resource: keyof typeof statement,
  action: string,
): boolean {
  const granted = roles[role].statements as Partial<Record<string, readonly string[]>>;
  const actions = granted[resource];
  return Array.isArray(actions) && actions.includes(action);
}
