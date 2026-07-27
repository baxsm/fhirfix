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
        { label: "Mapping rules", href: `${base}/mappings`, icon: Map },
        { label: "Conformance tests", href: `${base}/conformance`, icon: ShieldCheck },
        { label: "Scheduled checks", href: `${base}/monitoring`, icon: Radar },
      ],
    },
    {
      label: "Manage",
      items: [
        { label: "API access", href: `${base}/developers`, icon: KeyRound },
        {
          label: "Billing",
          href: `${base}/billing`,
          icon: CreditCard,
          requires: { resource: "billing", action: "view" },
        },
        {
          label: "Audit log",
          href: `${base}/audit`,
          icon: ScrollText,
          requires: { resource: "audit", action: "view" },
        },
        { label: "Settings", href: `${base}/settings`, icon: Settings },
      ],
    },
  ];
}

export type Crumb = { label: string; href?: string };

export function activeNavItem(workspace: string, pathname: string): NavItem | undefined {
  const root = `/app/${workspace}`;
  return navGroups(workspace)
    .flatMap((g) => g.items)
    .filter((i) => (i.href === root ? pathname === root : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function breadcrumbs(workspace: string, workspaceName: string, pathname: string): Crumb[] {
  const root = `/app/${workspace}`;
  const trail: Crumb[] = [{ label: workspaceName, href: root }];

  const section = activeNavItem(workspace, pathname);
  if (!section) return trail;

  const isSectionRoot = pathname === section.href;
  trail.push({
    label: section.label,
    // the current page is not a link. only ancestors are.
    href: isSectionRoot ? undefined : section.href,
  });

  if (isSectionRoot) return trail;

  const rest = pathname.slice(section.href.length).split("/").filter(Boolean);
  for (let i = 0; i < rest.length; i++) {
    const segment = rest[i];
    if (!segment) continue;
    const isLast = i === rest.length - 1;
    trail.push({
      label: decodeURIComponent(segment),
      href: isLast ? undefined : `${section.href}/${rest.slice(0, i + 1).join("/")}`,
    });
  }

  return trail;
}

export type { WorkspaceRole };
