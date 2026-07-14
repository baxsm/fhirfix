import {
  Activity,
  CreditCard,
  FileScan,
  KeyRound,
  LayoutDashboard,
  Map,
  Radar,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { WorkspaceRole } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  requires?: { resource: "billing" | "audit"; action: "view" };
};

export type NavGroup = { label: string; items: NavItem[] };

// grouped nav breaks the flat list into meaningful sections: the daily
// remediation loop, the ongoing governance surfaces, and admin.
export function navGroups(workspace: string): NavGroup[] {
  const base = `/app/${workspace}`;
  return [
    {
      label: "Remediate",
      items: [
        { label: "Overview", href: base, icon: LayoutDashboard },
        { label: "New check", href: `${base}/check`, icon: FileScan },
        { label: "Runs", href: `${base}/runs`, icon: Activity },
      ],
    },
    {
      label: "Govern",
      items: [
        { label: "Mappings", href: `${base}/mappings`, icon: Map },
        { label: "Conformance", href: `${base}/conformance`, icon: ShieldCheck },
        { label: "Monitoring", href: `${base}/monitoring`, icon: Radar },
      ],
    },
    {
      label: "Manage",
      items: [
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
      ],
    },
  ];
}

export type { WorkspaceRole };
