import { Bullets, Clause, LegalPage } from "../legal-page";

export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="29 July 2026"
      intro="These terms cover your use of FHIRfix. By creating an account or using the API you agree to them."
    >
      <Clause heading="What the service does">
        <p>
          FHIRfix validates healthcare data against FHIR implementation guides, explains what fails,
          and applies deterministic corrections where it safely can. It is a data quality tool. It
          does not provide medical advice, and it is not a certified EHR or a clinical decision
          support system.
        </p>
        <p>
          Validation results reflect the implementation guide versions in effect at the time of a
          run. Conformance with a guide is not a guarantee of regulatory compliance, which remains
          your responsibility.
        </p>
      </Clause>

      <Clause heading="Your account">
        <p>
          You are responsible for activity under your account and API keys, and for keeping
          credentials secret. Tell us promptly if you believe a key has been exposed; you can revoke
          a key at any time from the dashboard.
        </p>
        <p>
          A workspace owner controls membership, billing, and deletion for that workspace. You must
          be old enough to enter a contract in your jurisdiction, and if you accept these terms for
          an organization you confirm you are authorized to bind it.
        </p>
      </Clause>

      <Clause heading="Your data">
        <p>
          You keep ownership of everything you submit. You grant us only the licence needed to
          operate the service for you: to process, store, and return your data as the product
          requires.
        </p>
        <p>
          You are responsible for having the right to submit the data you send, including any
          patient data, and for choosing a redaction policy appropriate to it. Do not submit data
          you are not permitted to disclose to a processor.
        </p>
      </Clause>

      <Clause heading="Protected health information">
        <p>
          FHIRfix is built to process PHI. Where we handle PHI on your behalf we act as a business
          associate, and that processing is governed by a Business Associate Agreement. Request one
          from your workspace settings before sending PHI.
        </p>
        <p>
          Each workspace chooses how PHI is handled at ingest: stored as sent, redacted before
          storage, or required to be redacted. Retention is set per workspace, and artifacts are
          deleted automatically once that period elapses.
        </p>
      </Clause>

      <Clause heading="Credits and payment">
        <p>
          Runs consume prepaid credits at the rates shown on the pricing page. Credits are charged
          only when a run completes; a run that fails is not charged. Credits do not expire.
        </p>
        <Bullets
          items={[
            "Purchases are handled by our merchant of record, Polar, who is the seller for the transaction.",
            "Auto-recharge, when enabled, charges the payment method from your most recent purchase.",
            "A monthly spend cap stops auto-recharge once reached. It does not stop runs; your balance does that.",
            "Premium is billed monthly in advance and cancels at the end of the paid period.",
          ]}
        />
        <p>
          Prepaid credits are generally non-refundable. If you believe you were charged in error,
          contact us and we will look at it in good faith.
        </p>
      </Clause>

      <Clause heading="Acceptable use">
        <p>You agree not to:</p>
        <Bullets
          items={[
            "Submit data you have no right to process, or use the service to violate privacy law.",
            "Attempt to breach isolation between workspaces, or access another customer's data.",
            "Circumvent rate limits, credit metering, or plan restrictions.",
            "Resell the service or present its output as an independent certification.",
          ]}
        />
      </Clause>

      <Clause heading="Availability and support">
        <p>
          We aim to keep the service available and to warn you before disruptive changes, but we do
          not offer a contractual uptime guarantee unless one is agreed in writing. Validation
          depends on upstream implementation guides and terminology, which change independently of
          us.
        </p>
      </Clause>

      <Clause heading="Termination">
        <p>
          You can stop using the service and delete your workspace at any time. Deletion removes
          your runs, findings, stored files, and mappings immediately. Billing records, the audit
          trail, and conformance evidence bundles are retained in an anonymized form detached from
          the workspace, because we are required to keep an accurate financial and compliance
          record.
        </p>
        <p>
          We may suspend an account for non-payment or for the acceptable use breaches above, and
          will tell you why where we lawfully can.
        </p>
      </Clause>

      <Clause heading="Warranties and liability">
        <p>
          The service is provided as is. To the extent the law allows, we exclude implied warranties
          and are not liable for indirect or consequential loss. Our aggregate liability is limited
          to the amount you paid us in the twelve months before the claim.
        </p>
        <p>
          Nothing here limits liability that cannot lawfully be limited, including for fraud or
          death and personal injury caused by negligence.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          We may update these terms. For material changes we will give notice in the product or by
          email before they take effect. Continuing to use the service after that means you accept
          the updated terms.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Questions about these terms: <span className="font-mono">legal@fhirfix.dev</span>
        </p>
      </Clause>
    </LegalPage>
  );
}
