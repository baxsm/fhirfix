import { Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pricing",
};

const TIERS = [
  {
    name: "Free",
    tagline: "For trying it on real records.",
    features: [
      "Validate against US Core 6.1.0",
      "Ranked, plain-language findings",
      "Deterministic safe fixes + re-verify",
      "Included monthly check credits",
    ],
    cta: "Start free",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Team",
    tagline: "For teams remediating at volume.",
    features: [
      "Everything in Free",
      "Batch uploads (Bundle / NDJSON / ZIP)",
      "Mapping registry + scheduled checks",
      "Public REST API, SDKs, and CLI",
      "Usage dashboard + credit auto-recharge",
    ],
    cta: "Get started",
    href: "/sign-up",
    highlight: true,
  },
  {
    name: "Premium",
    price: "$499",
    period: "per month, plus credits",
    tagline: "For regulated production workloads.",
    features: [
      "Everything in Team",
      "CMS-0057-F conformance packet",
      "Signed, immutable evidence bundles",
      "Regression tracking across runs",
      "Priority validator capacity",
    ],
    cta: "Start free",
    href: "/sign-up",
    highlight: false,
  },
];

// chrome (header/footer/light-lock) comes from src/app/(marketing)/layout.tsx.
export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-5 py-14 sm:px-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Pay per check, not per seat.</h1>
        <p className="mx-auto max-w-lg text-muted-foreground">
          Each remediation run draws from a credit balance. Start free, add credits as you scale,
          and set spend caps so a batch never surprises you.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "flex flex-col rounded-lg border bg-card p-5 raised",
              tier.highlight && "border-interactive/50",
            )}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{tier.name}</h2>
                {tier.highlight && (
                  <span className="rounded bg-interactive/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-interactive">
                    Popular
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{tier.tagline}</p>
            </div>
            {/* the slot is reserved on every card so the feature lists start on one line */}
            <div className="mt-4 min-h-[2.75rem]">
              {"price" in tier && tier.price ? (
                <>
                  <span className="text-2xl font-semibold tracking-tight">{tier.price}</span>
                  <p className="text-xs text-muted-foreground">{tier.period}</p>
                </>
              ) : (
                <>
                  <span className="text-2xl font-semibold tracking-tight">Pay as you go</span>
                  <p className="text-xs text-muted-foreground">$0.01 per resource validated</p>
                </>
              )}
            </div>
            <ul className="mt-5 flex-1 space-y-2">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
                  <span className="text-muted-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant={tier.highlight ? "default" : "outline"}
              className="mt-5 w-full"
            >
              <Link href={tier.href}>{tier.cta}</Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Credit rates and invoices are shown at checkout. Every run reports the credits it used.
      </p>
    </div>
  );
}
