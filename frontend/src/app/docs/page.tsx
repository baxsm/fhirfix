import Link from "next/link";
import { CodeBlock } from "@/components/docs/code-block";
import { CodeTabs } from "@/components/docs/code-tabs";
import {
  DocSection,
  EndpointSection,
  ParamRow,
  RefSection,
  ScoreLift,
  StatusTable,
} from "@/components/docs/doc-primitives";
import { env } from "@/lib/env";

// the real API this deployment talks to, same var the playground fires at. every
// curl and snippet on this page shows the host a reader can actually reach, so
// deploying is an env change and the docs follow.
const BASE_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

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

const CURL_AUTH = `curl ${BASE_URL}/runs \\
  -H "Authorization: Bearer ffx_test_..."`;

// the client libraries. every snippet below is the real shipped surface of
// sdk/js and sdk/python - not illustrative pseudocode.
const INSTALL_NODE = "npm install fhirfix";
const INSTALL_PYTHON = "pip install fhirfix";
const INSTALL_CLI = "npm install -g @fhirfix/cli";

const SDK_NODE = `import { Fhirfix } from "fhirfix";

const fhirfix = new Fhirfix({
  apiKey: process.env.FHIRFIX_API_KEY,
  baseUrl: "${BASE_URL}",
});

const result = await fhirfix.fix({ input: patientJson });

console.log(result.conformanceScoreBefore, "->", result.conformanceScoreAfter);
console.log(result.corrected);`;

const SDK_PYTHON = `from fhirfix import Fhirfix

# or set FHIRFIX_API_KEY and FHIRFIX_BASE_URL in the environment
fhirfix = Fhirfix(base_url="${BASE_URL}")

result = fhirfix.fix(input=patient_json)

print(result.conformance_score_before, "->", result.conformance_score_after)
print(result.corrected)`;

const SDK_ERRORS_NODE = `import { Fhirfix, RateLimitError, OutOfCreditsError } from "fhirfix";

try {
  await fhirfix.fix({ input, idempotencyKey: "order-1234" });
} catch (err) {
  if (err instanceof RateLimitError) {
    await sleep((err.retryAfter ?? 1) * 1000);
  } else if (err instanceof OutOfCreditsError) {
    // add credits or enable auto-recharge
  }
}`;

const SDK_ERRORS_PYTHON = `from fhirfix import RateLimitError, OutOfCreditsError

try:
    fhirfix.fix(input=patient_json, idempotency_key="order-1234")
except RateLimitError as err:
    time.sleep(err.retry_after or 1)
except OutOfCreditsError:
    ...  # add credits or enable auto-recharge`;

const CLI_USAGE = `export FHIRFIX_API_KEY=ffx_test_...
export FHIRFIX_BASE_URL=${BASE_URL}

# report findings, exit 1 if any are errors
fhirfix validate ./bundle.json

# apply safe fixes in place
fhirfix fix ./patient.json --write

# gate on warnings too
fhirfix validate ./out/*.json --fail-on warning`;

const ACTION_YML = `- uses: fhirfix/fhirfix-action@v1
  with:
    path: "fhir/**/*.json"
    api-key: \${{ secrets.FHIRFIX_API_KEY }}
    base-url: ${BASE_URL}
    fail-on: error`;

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

const CURL_IDEMPOTENT = `curl ${BASE_URL}/fix \\
  -H "Authorization: Bearer ffx_test_..." \\
  -H "Idempotency-Key: 8f1c2b9a-4d17-4c1e-9d2a-6b3f0e5c7a19" \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "<FHIR or HL7v2>" }'`;

const IDEMPOTENCY_CONFLICT = `{
  "error": {
    "code": "idempotency_conflict",
    "message": "This Idempotency-Key was already used with a different request body."
  }
}`;

const WEBHOOK_PAYLOAD = `{
  "event": "run.completed",
  "data": {
    "runId": "run_a2xuoyti2ktb7xynihlq",
    "inputType": "fhir",
    "resourceCount": 1,
    "conformanceScoreBefore": 730,
    "conformanceScoreAfter": 850,
    "findingsTotal": 3,
    "findingsAutoFixable": 1,
    "reVerifiedClean": false
  }
}`;

const VERIFY_SIGNATURE = `const [t, v1] = header.split(",").map((p) => p.split("=")[1]);
const expected = crypto
  .createHmac("sha256", process.env.FHIRFIX_SIGNING_SECRET)
  .update(\`\${t}.\${rawBody}\`)
  .digest("hex");

// constant-time compare, and reject old timestamps to stop replays
crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected));`;

export default function DocsPage() {
  return (
    <div className="space-y-12">
      {/* intro: title prose left, the playground callout takes the rail slot so the
          two-column rhythm starts at the very first screen. */}
      <div className="grid gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <header className="min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground">API reference</p>
          <h1 className="text-3xl font-semibold tracking-tight">FHIRfix REST API</h1>
          <p className="text-muted-foreground">
            Validate against US Core, apply safe deterministic fixes, and convert HL7v2 or C-CDA to
            FHIR from your own code. REST, JSON in and out, one API key.
          </p>
        </header>

        {/* the rail slot: client libraries first (the thing a reader reaches for
            on arrival), then the playground for anyone not writing code yet. */}
        <div className="min-w-0 space-y-3 self-start">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs font-medium">Client libraries</p>
            <div className="mt-2 space-y-1.5">
              <ClientLib name="JavaScript" install={INSTALL_NODE} href="#sdks" />
              <ClientLib name="Python" install={INSTALL_PYTHON} href="#sdks" />
              <ClientLib name="CLI" install={INSTALL_CLI} href="#cli" />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
            <span>
              Prefer to try it without writing code? The{" "}
              <Link href="/docs/playground" className="text-interactive hover:underline">
                playground
              </Link>{" "}
              fires real test-mode requests against this API from your browser.
            </span>
          </div>
        </div>
      </div>

      {/* overview sections: same prose-left / rail-right split as the endpoints
          below, so the reference rhythm starts at the top of the page instead of
          leaving a dead gap next to the first three sections. */}
      <div className="space-y-12">
        <RefSection
          id="base-url"
          title="Base URL"
          rail={<CodeBlock code={BASE_URL} label="base url" />}
        >
          <p className="text-sm text-muted-foreground">
            Every request goes to this base. Use HTTPS for any deployment reachable over a network.
          </p>
        </RefSection>

        <RefSection
          id="authentication"
          title="Authentication"
          rail={<CodeBlock code={CURL_AUTH} label="authenticated request" />}
        >
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
        </RefSection>

        <RefSection
          id="quickstart"
          title="Quickstart"
          rail={
            <>
              <CodeBlock code={CURL_FIX} label="request" />
              <CodeBlock code={FIX_RESPONSE} label="200 response" />
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Post a FHIR resource, bundle, or HL7v2 message as{" "}
            <code className="font-mono text-xs">input</code>. This fixes it and returns the
            corrected artifact plus a before/after conformance score.
          </p>
        </RefSection>
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
          rail={
            <>
              <CodeBlock code={CURL_IDEMPOTENT} label="request" />
              <CodeBlock code={IDEMPOTENCY_CONFLICT} label="409 conflict" />
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Network calls fail. Send an <code className="font-mono text-xs">Idempotency-Key</code>{" "}
            header and you can retry a request without risking a second charge or a duplicate run.
            Use a fresh UUID per logical request.
          </p>
          <div>
            <h3 className="text-sm font-medium">How a key is resolved</h3>
            <div className="mt-1">
              <ParamRow name="same key, same body" type="replay" noChip>
                Returns the original run and its stored result. Nothing is re-processed and no
                credits are spent.
              </ParamRow>
              <ParamRow name="same key, different body" type="409" noChip>
                Rejected with <code className="font-mono text-xs">idempotency_conflict</code>. This
                catches a key accidentally reused for a different payload.
              </ParamRow>
              <ParamRow name="no key" type="new run" noChip>
                Every request creates a new run and is charged normally.
              </ParamRow>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Keys are scoped to your workspace, so they never collide with another customer. The
            check runs before any credit is spent, and a retry that arrives while the first is still
            in flight also returns <code className="font-mono text-xs">409 Conflict</code> rather
            than double-charging.
          </p>
        </RefSection>

        <RefSection
          id="webhooks"
          title="Webhooks"
          rail={
            <>
              <CodeBlock code={WEBHOOK_PAYLOAD} label="run.completed payload" />
              <CodeBlock code={VERIFY_SIGNATURE} label="verify the signature (node)" />
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Register an endpoint in developer settings to get a signed POST when a run finishes,
            instead of polling.
          </p>
          <div>
            <h3 className="text-sm font-medium">Events</h3>
            <div className="mt-1">
              <ParamRow name="run.completed" type="event" noChip>
                A run finished. The payload carries the before/after score and finding counts.
              </ParamRow>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium">Verifying a delivery</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every delivery carries an{" "}
              <code className="font-mono text-xs">X-FHIRfix-Signature</code> header of the form{" "}
              <code className="font-mono text-xs">t=&lt;timestamp&gt;,v1=&lt;hmac&gt;</code>.
              Compute the HMAC-SHA256 of{" "}
              <code className="font-mono text-xs">&lt;timestamp&gt;.&lt;raw body&gt;</code> with
              your signing secret and compare it to <code className="font-mono text-xs">v1</code> in
              constant time. Sign the raw body, not a re-serialized object, or the hash will not
              match. Reject deliveries whose timestamp is older than a few minutes to stop replays.
            </p>
          </div>
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

      {/* client libraries: the same prose-left / rail-right split, with the rail
          carrying the reader's own language rather than three stacked blocks. */}
      <div className="space-y-12">
        <RefSection
          id="sdks"
          title="SDKs"
          rail={
            <>
              <CodeTabs
                tabs={[
                  { label: "node", code: INSTALL_NODE },
                  { label: "python", code: INSTALL_PYTHON },
                ]}
              />
              <CodeTabs
                tabs={[
                  { label: "node", code: SDK_NODE },
                  { label: "python", code: SDK_PYTHON },
                ]}
              />
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            Typed clients for JavaScript and Python. Both cover validate, fix, convert, batch, and
            runs, and both are dependency-free: the JavaScript client runs on Node 18+, Bun, Deno,
            and edge runtimes, the Python client on 3.9+.
          </p>
          <p className="text-sm text-muted-foreground">
            Each client reads <code className="font-mono text-xs">FHIRFIX_API_KEY</code> from the
            environment when you do not pass a key.
          </p>
          <div>
            <h3 className="text-sm font-medium">Errors and retries</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Failed requests raise a typed error per status, so you branch on the class rather than
              a code. Rate limits and 5xx are retried automatically with backoff, honouring{" "}
              <code className="font-mono text-xs">Retry-After</code>. A 4xx you have to fix is never
              retried.
            </p>
          </div>
        </RefSection>

        <RefSection
          id="cli"
          title="CLI and CI"
          rail={
            <>
              <CodeTabs
                tabs={[
                  { label: "shell", code: CLI_USAGE },
                  { label: "github action", code: ACTION_YML },
                ]}
              />
              <CodeTabs
                tabs={[
                  { label: "node", code: SDK_ERRORS_NODE },
                  { label: "python", code: SDK_ERRORS_PYTHON },
                ]}
              />
            </>
          }
        >
          <p className="text-sm text-muted-foreground">
            The CLI checks files from a terminal or a build. It exits{" "}
            <code className="font-mono text-xs">1</code> when findings meet the{" "}
            <code className="font-mono text-xs">--fail-on</code> threshold, so a pipeline fails on
            non-conformant FHIR before it ships.
          </p>
          <p className="text-sm text-muted-foreground">
            Every other exit code is a distinct reason the check could not run:{" "}
            <code className="font-mono text-xs">3</code> auth,{" "}
            <code className="font-mono text-xs">4</code> out of credits,{" "}
            <code className="font-mono text-xs">5</code> API unreachable,{" "}
            <code className="font-mono text-xs">6</code> unreadable input. A build can tell a real
            conformance failure from an outage.
          </p>
          <p className="text-sm text-muted-foreground">
            The GitHub Action wraps the CLI and annotates the pull request diff with each finding
            and its suggested fix.
          </p>
        </RefSection>
      </div>
    </div>
  );
}

// one row of the intro rail's client-libraries card: the language and the exact
// install line, which is the only thing a reader needs off this card.
function ClientLib({ name, install, href }: { name: string; install: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-baseline justify-between gap-3 rounded px-1.5 py-1 transition-colors hover:bg-muted/60"
    >
      <span className="text-xs text-foreground">{name}</span>
      <code className="truncate font-mono text-[10px] text-muted-foreground/80">{install}</code>
    </Link>
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
