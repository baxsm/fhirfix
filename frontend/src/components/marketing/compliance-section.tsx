import { FileCheck2, KeyRound, Lock, ScrollText, ShieldCheck, Zap } from "lucide-react";
import { Reveal } from "./motion";

// the credibility section (Medplum's lesson, our visuals). speaks the regulated
// buyer's language: the CMS-0057-F packet, SSO, BAA + PHI controls, audit trail.
// all real Premium-tier capabilities.

const ITEMS = [
  {
    icon: FileCheck2,
    title: "CMS-0057-F conformance packet",
    body: "Generate the evidence packet payers and regulators ask for, straight from your validated runs.",
  },
  {
    icon: KeyRound,
    title: "SSO / SAML",
    body: "Bring your identity provider. Enforce single sign-on across the workspace.",
  },
  {
    icon: Lock,
    title: "BAA + PHI retention controls",
    body: "A signed BAA and retention policy you control. Protected health data stays encrypted, and corrected exports are redacted.",
  },
  {
    icon: ScrollText,
    title: "Audit trail",
    body: "Every check, fix, and export is recorded as an expandable, exportable audit event.",
  },
  {
    icon: Zap,
    title: "Priority validator capacity",
    body: "Dedicated validator throughput so large batches and scheduled runs don't wait in line.",
  },
  {
    icon: ShieldCheck,
    title: "Safe by construction",
    body: "Fixes that could change clinical meaning are gated behind explicit opt-in, never applied silently.",
  },
];

export function ComplianceSection() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-2xl">
          <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
            For regulated workloads
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-[2.5rem] sm:leading-[1.08]">
            Built to survive a compliance review.
          </h2>
          <p className="mt-4 text-balance text-muted-foreground">
            When conformance is a deadline, not a nice-to-have — the controls a regulated team needs
            are already here.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} className="flex gap-3.5" index={i % 3}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card">
                  <Icon className="size-4.5 text-success" />
                </span>
                <div className="space-y-1">
                  <h3 className="font-medium">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
