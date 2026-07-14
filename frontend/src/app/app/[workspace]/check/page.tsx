import { FileScan } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function Page() {
  return (
    <PhasePlaceholder
      title="New check"
      phase="Phase 3"
      icon={FileScan}
      description="Paste or upload FHIR and HL7v2, pick profiles, and run the remediation engine."
    />
  );
}
