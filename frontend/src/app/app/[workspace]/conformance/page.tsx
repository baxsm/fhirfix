import { ShieldCheck } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default async function Page({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace } = await params;
  return (
    <PhasePlaceholder
      title="Conformance tests"
      icon={ShieldCheck}
      description="Launch CMS-0057-F Inferno test kits and export attestation-ready audit evidence."
      whatItWillDo="Run the official Inferno test kits against your endpoints and export the evidence pack regulators ask for, instead of assembling it by hand."
      meanwhile={{
        label: "Run a check",
        href: `/app/${workspace}/check`,
        body: "A conformance check already scores your data against US Core and lists what fails.",
      }}
    />
  );
}
