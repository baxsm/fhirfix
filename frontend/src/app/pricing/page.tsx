import { Check } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Pricing · FHIRfix",
};

// tiers mirror workspace_settings.plan_tier (free | team | premium). checkout and
// per-credit rates are configured at billing time; this page states what each tier
// includes, not invented dollar figures.
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
    tagline: "For regulated production workloads.",
    features: [
      "Everything in Team",
      "CMS-0057-F conformance packet",
      "SSO / SAML + audit trail",
      "BAA + PHI retention controls",
      "Priority validator capacity",
    ],
    cta: "Contact sales",
    href: "/sign-up",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
        <Link href="/">
          <BrandMark size="md" />
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/playground">Playground</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-14">
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
              <ul className="mt-4 flex-1 space-y-2">
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
      </main>
    </div>
  );
}
