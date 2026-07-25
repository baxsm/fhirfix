import { Radar } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <PhasePlaceholder
      title="Scheduled checks"
      icon={Radar}
      description="Scheduled checks and drift alerts across your endpoints and source systems."
      whatItWillDo="Check your endpoints on a schedule and alert you when conformance drops, so a regression is caught before an audit finds it."
      meanwhile={{
        label: "View runs",
        href: `/app/${workspace}/runs`,
        body: "Every check you run is already scored and kept, so you can compare results over time.",
      }}
    />
  );
}
