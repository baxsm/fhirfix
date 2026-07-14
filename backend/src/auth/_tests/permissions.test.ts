import { describe, expect, test } from "bun:test";
import { hasPermission } from "../permissions";

describe("role permissions", () => {
  test("auditor is read-only everywhere", () => {
    expect(hasPermission("auditor", "run", "view")).toBe(true);
    expect(hasPermission("auditor", "audit", "view")).toBe(true);
    expect(hasPermission("auditor", "run", "create")).toBe(false);
    expect(hasPermission("auditor", "mapping", "create")).toBe(false);
    expect(hasPermission("auditor", "workspaceSettings", "update")).toBe(false);
  });

  test("member can work but not manage settings or billing", () => {
    expect(hasPermission("member", "run", "create")).toBe(true);
    expect(hasPermission("member", "mapping", "approve")).toBe(true);
    expect(hasPermission("member", "apiKey", "create")).toBe(true);
    expect(hasPermission("member", "workspaceSettings", "update")).toBe(false);
    expect(hasPermission("member", "billing", "manage")).toBe(false);
  });

  test("billing role manages billing, not members", () => {
    expect(hasPermission("billing", "billing", "manage")).toBe(true);
    expect(hasPermission("billing", "run", "create")).toBe(true);
    expect(hasPermission("billing", "mapping", "create")).toBe(false);
  });

  test("admin manages settings, members, and billing", () => {
    expect(hasPermission("admin", "workspaceSettings", "update")).toBe(true);
    expect(hasPermission("admin", "billing", "manage")).toBe(true);
    expect(hasPermission("admin", "mapping", "deprecate")).toBe(true);
  });

  test("owner can do everything the others can", () => {
    expect(hasPermission("owner", "workspaceSettings", "update")).toBe(true);
    expect(hasPermission("owner", "billing", "manage")).toBe(true);
    expect(hasPermission("owner", "apiKey", "revoke")).toBe(true);
    expect(hasPermission("owner", "audit", "view")).toBe(true);
  });
});
