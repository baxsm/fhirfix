import {
  Activity,
  CreditCard,
  FileScan,
  KeyRound,
  LayoutDashboard,
  Map,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { WorkspaceRole } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  // minimum resource the role must be able to view. undefined = any member.
  requires?: { resource: "billing" | "audit"; action: "view" };
};

// nav is workspace-scoped. hrefs are suffixed onto /app/[workspace].
export function navItems(workspace: string): NavItem[] {
  const base = `/app/${workspace}`;
  return [
    { label: "Overview", href: base, icon: LayoutDashboard },
    { label: "New check", href: `${base}/check`, icon: FileScan },
    { label: "Runs", href: `${base}/runs`, icon: Activity },
    { label: "Mappings", href: `${base}/mappings`, icon: Map },
    { label: "Conformance", href: `${base}/conformance`, icon: ShieldCheck },
    { label: "Monitoring", href: `${base}/monitoring`, icon: ScrollText },
    { label: "Developers", href: `${base}/developers`, icon: KeyRound },
    {
      label: "Billing",
      href: `${base}/billing`,
      icon: CreditCard,
      requires: { resource: "billing", action: "view" },
    },
    {
      label: "Audit",
      href: `${base}/audit`,
      icon: ScrollText,
      requires: { resource: "audit", action: "view" },
    },
    { label: "Settings", href: `${base}/settings`, icon: Settings },
  ];
}

export type { WorkspaceRole };
