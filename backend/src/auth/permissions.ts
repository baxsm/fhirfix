import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, ownerAc } from "better-auth/plugins/organization/access";

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

// auditor: read-only everywhere. no mutations.
export const auditor = ac.newRole({
  workspaceSettings: ["view"],
  billing: ["view"],
  run: ["view"],
  mapping: ["view"],
  apiKey: ["view"],
  audit: ["view"],
  monitoring: ["view"],
});

// billing: manages credits/billing plus own reads. no member/role management.
export const billing = ac.newRole({
  workspaceSettings: ["view"],
  billing: ["view", "manage"],
  run: ["create", "view"],
  mapping: ["view"],
  apiKey: ["view"],
  monitoring: ["view"],
});

// member: does the actual work (runs, mappings, keys) but cannot change roles or billing.
export const member = ac.newRole({
  workspaceSettings: ["view"],
  billing: ["view"],
  run: ["create", "view"],
  mapping: ["view", "create", "approve", "deprecate"],
  apiKey: ["view", "create", "revoke"],
  audit: ["view"],
  monitoring: ["view", "manage"],
});

// admin: member + full member/invitation management + settings + billing.
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

// owner: everything, including workspace deletion and SSO (phase 8).
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

type Statement = typeof statement;
type Resource = keyof Statement;
type Action<R extends Resource> = Statement[R][number];

export function hasPermission<R extends Resource>(
  role: WorkspaceRole,
  resource: R,
  action: Action<R>,
): boolean {
  const granted = roles[role].statements as Partial<Record<Resource, readonly string[]>>;
  const actions = granted[resource];
  return Array.isArray(actions) && actions.includes(action as string);
}
