import { KeyRound } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function Page() {
  return (
    <PhasePlaceholder
      title="Developers"
      phase="Phase 5"
      icon={KeyRound}
      description="API keys, webhooks, and request logs for the public REST API, SDKs, and CI."
    />
  );
}
