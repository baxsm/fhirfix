import { Map } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function Page() {
  return (
    <PhasePlaceholder
      title="Mappings"
      phase="Phase 6"
      icon={Map}
      description="The versioned registry of assigning-authority and code mappings that power auto-fixes."
    />
  );
}
