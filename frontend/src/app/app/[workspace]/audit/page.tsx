import { ScrollText } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <PhasePlaceholder
      title="Audit log"
      icon={ScrollText}
      description="Immutable log of every run, mapping change, key rotation, and role change."
      whatItWillDo="Show who changed what and when, in a record that cannot be edited, so you can answer an auditor without reconstructing history."
      meanwhile={{
        label: "View request logs",
        href: `/app/${workspace}/developers`,
        body: "API request logs already record every call this workspace made.",
      }}
    />
  );
}
