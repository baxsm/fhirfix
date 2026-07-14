import { Radar } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function Page() {
  return (
    <PhasePlaceholder
      title="Monitoring"
      phase="Phase 6"
      icon={Radar}
      description="Scheduled checks and drift alerts across your endpoints and source systems."
    />
  );
}
