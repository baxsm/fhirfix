import { Activity } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function Page() {
  return (
    <PhasePlaceholder
      title="Runs"
      phase="Phase 3"
      icon={Activity}
      description="History of every conformance check with findings, credits, and before/after scores."
    />
  );
}
