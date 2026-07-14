import { ScrollText } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function Page() {
  return (
    <PhasePlaceholder
      title="Audit"
      phase="Phase 8"
      icon={ScrollText}
      description="Immutable log of every run, mapping change, key rotation, and role change."
    />
  );
}
