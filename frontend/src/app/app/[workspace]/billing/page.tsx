import { CreditCard } from "lucide-react";
import { PhasePlaceholder } from "@/components/dashboard/phase-placeholder";

export default function Page() {
  return (
    <PhasePlaceholder
      title="Billing"
      phase="Phase 4"
      icon={CreditCard}
      description="Prepaid credit balance, usage, invoices, auto-recharge, and spend caps."
    />
  );
}
