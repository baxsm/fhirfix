import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import {
  DocSection,
  EndpointSection,
  ParamRow,
  RefSection,
  ScoreLift,
  StatusTable,
} from "@/components/docs/doc-primitives";

const BASE_URL = "https://api.fhirfix.dev/api/v1";

const CURL_FIX = `curl ${BASE_URL}/fix \\
  -H "Authorization: Bearer ffx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "<FHIR or HL7v2>" }'`;

const CURL_VALIDATE = `curl ${BASE_URL}/validate \\
  -H "Authorization: Bearer ffx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "<FHIR or HL7v2>" }'`;

const CURL_CONVERT = `curl ${BASE_URL}/convert \\
  -H "Authorization: Bearer ffx_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "MSH|^~\\\\&|..." }'`;

const CURL_RUNS = `curl "${BASE_URL}/runs?limit=20" \\
  -H "Authorization: Bearer ffx_test_..."`;

const FIX_RESPONSE = `{
  "runId": "run_a2xuoyti2ktb7xynihlq",
  "conformanceScoreBefore": 730,
  "conformanceScoreAfter": 850,
  "reVerifiedClean": false,
  "findingsTotal": 3,
  "findingsAutoFixable": 1,
  "corrected": "{ ...corrected FHIR... }"
}`;

const VALIDATE_RESPONSE = `{
  "runId": "run_a2xuoyti2ktb7xynihlq",
  "status": "completed",
  "conformanceScoreBefore": 730,
  "findingsTotal": 3,
  "findings": [
    {
      "severity": "error",
      "category": "terminology",
      "fhirpath": "Patient.gender",
      "plainMessage": "gender carries an invalid code.",
      "suggestedFix": "Map \\"M\\" to \\"male\\".",
      "fixConfidence": "auto"
    }
  ]
}`;

const CONVERT_RESPONSE = `{
  "runId": "run_9x0...",
  "status": "completed",
  "inputType": "hl7v2",
  "corrected": "{ ...FHIR Bundle... }"
}`;

const RUNS_RESPONSE = `{
  "runs": [
    {
      "id": "run_a2xuoyti2ktb7xynihlq",
      "status": "completed",
      "conformanceScoreBefore": 730,
      "conformanceScoreAfter": 850,
      "findingsTotal": 3,
      "createdAt": "2026-07-15T19:15:31Z"
    }
  ],
  "nextCursor": null
}`;

export default function DocsPage() {
  return (
    <div className="space-y-12">
      <header className="max-w-2xl space-y-2">
        <p className="text-xs text-muted-foreground">API reference</p>
        <h1 className="text-3xl font-semibold tracking-tight">FHIRfix REST API</h1>
        <p className="text-muted-foreground">
          Validate against US Core, apply safe deterministic fixes, and convert HL7v2 or C-CDA to
          FHIR from your own code. REST over HTTPS, JSON in and out, one API key.
        </p>
      </header>

      <div className="flex max-w-2xl items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
        <span>
          Prefer to try it without writing code? The{" "}
          <Link href="/docs/playground" className="text-interactive hover:underline">
            playground
          </Link>{" "}
          fires real test-mode requests against this API from your browser.
        </span>
      </div>

      {/* overview sections: full-width prose, no rail. */}
      <div className="max-w-2xl space-y-12">
        <DocSection id="base-url" title="Base URL">
          <p className="text-sm text-muted-foreground">
            Every request goes to this base. HTTPS only.
          </p>
          <CodeBlock code={BASE_URL} label="base url" />
        </DocSection>

        <DocSection id="authentication" title="Authentication">
          <p className="text-sm text-muted-foreground">
            Authenticate with an API key from your workspace{" "}
            <Link href="/app" className="text-interactive hover:underline">
              developer settings
            </Link>
            , passed as a Bearer token. Test keys start with{" "}
            <code className="font-mono text-xs">ffx_test_</code> and never touch live credits; live
            keys start with <code className="font-mono text-xs">ffx_live_</code>. Keep live keys
            secret.
          </p>
          <CodeBlock code={`Authorization: Bearer ffx_test_...`} label="header" />
        </DocSection>

        <DocSection id="quickstart" title="Quickstart">
          <p className="text-sm text-muted-foreground">
            Post a FHIR resource, bundle, or HL7v2 message as{" "}
            <code className="font-mono text-xs">input</code>. This fixes it and returns the
            corrected artifact plus a before/after conformance score.
          </p>
          <CodeBlock code={CURL_FIX} label="curl" />
        </DocSection>
      </div>

      {/* endpoint sections: prose + params left, request/response rail right. */}
      <div className="space-y-12">
        <EndpointSection
          id="validate"
          title="Validate"
          method="POST"
          path="/validate"
          rail={
            <>
              <CodeBlock code={CURL_VALIDATE} label="request" />
              <CodeBlock code={VALIDATE_RESPONSE} label="200 response" />
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Run the conformance check and return ranked findings with a score. No fixes are applied.
            Requires the <code className="font-mono text-xs">validate</code> scope.
          </p>
          <RequestBody />
        </EndpointSection>

        <EndpointSection
          id="fix"
          title="Fix"
          method="POST"
          path="/fix"
          rail={
            <>
              <CodeBlock code={CURL_FIX} label="request" />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                    200 response
                  </span>
                  <ScoreLift before={730} after={850} />
                </div>
                <CodeBlock code={FIX_RESPONSE} label="body" />
              </div>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Validate, apply the safe deterministic fixes, and re-verify. Returns the corrected
            artifact and the before/after score. Requires the{" "}
            <code className="font-mono text-xs">fix</code> scope.
          </p>
          <RequestBody />
        </EndpointSection>

        <EndpointSection
          id="convert"
          title="Convert"
          method="POST"
          path="/convert"
          rail={
            <>
              <CodeBlock code={CURL_CONVERT} label="request" />
              <CodeBlock code={CONVERT_RESPONSE} label="200 response" />
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Convert an HL7v2 message or C-CDA document to FHIR, applying your workspace mapping
            registry. Requires the <code className="font-mono text-xs">convert</code> scope.
          </p>
          <RequestBody />
        </EndpointSection>

        <EndpointSection
          id="runs"
          title="List runs"
          method="GET"
          path="/runs"
          rail={
            <>
              <CodeBlock code={CURL_RUNS} label="request" />
              <CodeBlock code={RUNS_RESPONSE} label="200 response" />
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            List past runs for the workspace, newest first. Cursor-paginated with{" "}
            <code className="font-mono text-xs">?cursor=</code> and{" "}
            <code className="font-mono text-xs">?limit=</code>. Requires the{" "}
            <code className="font-mono text-xs">runs</code> scope. The full report and corrected
            artifact are available at <code className="font-mono text-xs">/runs/:id/report</code>{" "}
            and <code className="font-mono text-xs">/runs/:id/corrected</code>.
          </p>
        </EndpointSection>
      </div>

      {/* reference sections: idempotency + webhooks use the left-prose / right-rail
          split so they match the endpoints and leave no dead gap. */}
      <div className="space-y-12">
        <RefSection
          id="idempotency"
          title="Idempotency"
          rail={<CodeBlock code={`Idempotency-Key: 8f1c2b9a-...`} label="header" />}
        >
          <p className="text-sm text-muted-foreground">
            Safely retry a request by sending an{" "}
            <code className="font-mono text-xs">Idempotency-Key</code> header. The same key with the
            same body replays the original run instead of charging again. The same key with a
            different body returns <code className="font-mono text-xs">409 Conflict</code>.
          </p>
        </RefSection>

        <RefSection
          id="webhooks"
          title="Webhooks"
          rail={<CodeBlock label="X-FHIRfix-Signature" code={`t=1731628800,v1=3f9a1c...`} />}
        >
          <p className="text-sm text-muted-foreground">
            Register an endpoint in developer settings to get a signed POST when a run completes or
            fails, instead of polling. Every delivery carries an{" "}
            <code className="font-mono text-xs">X-FHIRfix-Signature</code> header of the form{" "}
            <code className="font-mono text-xs">t=&lt;timestamp&gt;,v1=&lt;hmac&gt;</code>. Verify
            it by computing the HMAC-SHA256 of{" "}
            <code className="font-mono text-xs">&lt;timestamp&gt;.&lt;body&gt;</code> with your
            signing secret and comparing it to <code className="font-mono text-xs">v1</code>.
          </p>
        </RefSection>
      </div>

      {/* errors: the 9-row status table is genuinely wide, so it spans the full
          content width rather than being cramped into a rail. */}
      <div className="space-y-12">
        <DocSection id="errors" title="Errors">
          <p className="max-w-2xl text-sm text-muted-foreground">
            FHIRfix uses standard HTTP status codes. 2xx means success, 4xx means the request was
            rejected (and often tells you how to fix it), 5xx means something went wrong on our
            side.
          </p>
          <StatusTable
            rows={[
              { code: 200, name: "OK", description: "The request succeeded." },
              { code: 202, name: "Accepted", description: "A batch run was queued." },
              {
                code: 400,
                name: "Bad Request",
                description: "The request body was malformed or missing input.",
              },
              { code: 401, name: "Unauthorized", description: "No valid API key was provided." },
              {
                code: 402,
                name: "Payment Required",
                description: "The workspace is out of credits. Add credits and retry.",
              },
              {
                code: 403,
                name: "Forbidden",
                description: "The key does not have the scope for this action.",
              },
              {
                code: 409,
                name: "Conflict",
                description: "An idempotency key was reused with a different body.",
              },
              {
                code: 422,
                name: "Unprocessable",
                description: "The input is not a recognized FHIR or HL7v2 shape.",
              },
              {
                code: 429,
                name: "Too Many Requests",
                description: "Rate limited. Back off and retry after the Retry-After header.",
              },
            ]}
          />
        </DocSection>
      </div>
    </div>
  );
}

// the shared request body for validate/fix/convert. rendered under each endpoint
// so the params sit next to their route.
function RequestBody() {
  return (
    <div>
      <h3 className="text-sm font-medium">Body parameters</h3>
      <div className="mt-1">
        <ParamRow name="input" type="string" required>
          A FHIR resource or bundle (JSON), or an HL7v2 message.
        </ParamRow>
        <ParamRow name="profiles" type="string[]">
          Profile URLs to validate against. Defaults to the workspace profile (US Core).
        </ParamRow>
        <ParamRow name="redact" type="boolean">
          Redact PHI from the corrected output. Defaults to false.
        </ParamRow>
      </div>
    </div>
  );
}
