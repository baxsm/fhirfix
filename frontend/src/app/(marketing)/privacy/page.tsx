import { Bullets, Clause, LegalPage } from "../legal-page";

export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="29 July 2026"
      intro="How FHIRfix handles your data, and the healthcare data you send us to process."
    >
      <Clause heading="Two kinds of data">
        <p>
          <span className="font-medium text-foreground">Account data</span> is about you as a
          customer: your name, email, workspace, billing records, and how you use the product. We
          are the controller for it.
        </p>
        <p>
          <span className="font-medium text-foreground">Submitted data</span> is the healthcare data
          you send for validation. We process it only to run the service for you, on your
          instructions. For this data you are the controller and we are the processor. Where it
          includes PHI we act as a business associate under a BAA.
        </p>
      </Clause>

      <Clause heading="Account data we hold">
        <Bullets
          items={[
            "Name, email address, and hashed password, or the identifier from a social sign-in.",
            "Workspace membership and role.",
            "Billing account, credit ledger, and invoices. We never see or store full card numbers.",
            "API request logs: method, path, status, latency, and IP, for debugging and abuse prevention.",
            "An audit trail of sensitive actions: who did what, and when.",
          ]}
        />
      </Clause>

      <Clause heading="Submitted data and PHI">
        <p>Each workspace chooses how submitted data is handled before it is stored:</p>
        <Bullets
          items={[
            "Off: stored as sent.",
            "Redact on ingest: direct identifiers are stripped before anything is written to disk, and the engine works from the redacted copy.",
            "Required: the same, and a payload we cannot parse well enough to redact is rejected rather than stored.",
          ]}
        />
        <p>
          Submitted artifacts are kept for the retention period the workspace sets, then the stored
          bytes are deleted automatically. A record that the artifact existed and was disposed of
          remains, so the deletion itself is auditable.
        </p>
        <p>We do not use submitted data to train models, and we do not sell data of any kind.</p>
        <p>
          Deterministic validation and fixes never leave our infrastructure. The optional &ldquo;Fix
          with AI&rdquo; action is the exception: it sends the finding and the resource it applies
          to, as it stands at that moment, to our language model provider. Under a redacting policy
          that resource has already had direct identifiers stripped. If you do not want a resource
          leaving our infrastructure at all, do not use that action.
        </p>
      </Clause>

      <Clause heading="Who else processes data">
        <p>We use a small number of sub-processors, each for a specific purpose:</p>
        <Bullets
          items={[
            "Railway: application hosting and the managed Postgres and Redis instances.",
            "Polar: merchant of record for payments. They handle card data; we do not.",
            "ZeptoMail: transactional email such as verification and alerts.",
            "OpenRouter: optional language model assistance for explaining a finding.",
          ]}
        />
        <p>
          We will keep this list current and give notice before adding a sub-processor that handles
          submitted data.
        </p>
      </Clause>

      <Clause heading="Security">
        <Bullets
          items={[
            "Traffic is encrypted in transit; data at rest sits in managed, encrypted storage.",
            "API keys are hashed and shown once. Webhook signing secrets are encrypted at rest.",
            "Access is scoped per workspace and per role, and sensitive actions are recorded in an append-only audit log.",
            "Logs carry identifiers and event types, never resource bodies or patient data.",
          ]}
        />
      </Clause>

      <Clause heading="Your rights">
        <p>
          Depending on where you are, you may have rights to access, correct, export, or delete your
          personal data. Two of these are built into the product: any workspace admin can export a
          full archive, and an owner can delete a workspace outright.
        </p>
        <p>
          Deletion removes runs, findings, stored files, mappings, keys, and settings immediately.
          Billing records, the audit trail, and conformance evidence bundles survive in an
          anonymized form detached from the workspace, because accounting and compliance obligations
          require an accurate record. That is a deliberate reconciliation of erasure with
          immutability, not an oversight.
        </p>
      </Clause>

      <Clause heading="Cookies">
        <p>
          We set a session cookie so you stay signed in, and nothing else. There is no advertising
          or third-party tracking on this site.
        </p>
      </Clause>

      <Clause heading="International transfers">
        <p>
          Our infrastructure and sub-processors may process data outside your country. Where that
          happens we rely on appropriate safeguards, such as standard contractual clauses. If you
          need data to stay in a specific region, talk to us before sending it.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          We will post updates here and change the date above. For material changes affecting how we
          handle submitted data, we will give notice before they take effect.
        </p>
      </Clause>

      <Clause heading="Contact">
        <p>
          Privacy questions, or to exercise a right you cannot action in the product:{" "}
          <span className="font-mono">privacy@fhirfix.dev</span>
        </p>
      </Clause>
    </LegalPage>
  );
}
