# fhirfix

JavaScript and TypeScript client for the [FHIRfix](https://fhirfix.dev) REST API. Validate, fix, and convert FHIR conformance issues.

Works on Node 18+, Bun, Deno, browsers, and edge runtimes. No dependencies.

## Install

```bash
npm install fhirfix
```

## Usage

```ts
import { Fhirfix } from "fhirfix";

const fhirfix = new Fhirfix({ apiKey: "ffx_test_..." });

const result = await fhirfix.fix({ input: patientJson });

console.log(result.conformanceScoreBefore, "->", result.conformanceScoreAfter);
console.log(result.corrected);
```

The key is read from `FHIRFIX_API_KEY` when you do not pass one.

### Validate without changing anything

```ts
const { findings, findingsTotal } = await fhirfix.validate({ input: patientJson });

for (const finding of findings) {
  console.log(finding.severity, finding.plainMessage, finding.suggestedFix);
}
```

### Convert HL7v2 or C-CDA to FHIR

```ts
const { fhir } = await fhirfix.convert({ input: hl7v2Message });
```

### Large inputs

`batch` queues the work and returns immediately. Poll the run or receive a `run.completed` webhook.

```ts
const { runId } = await fhirfix.batch({ input: bigNdjson });
const { run } = await fhirfix.runs.get(runId);
```

### Runs

```ts
const page = await fhirfix.runs.list({ status: "completed", limit: 20 });
const next = page.hasMore ? await fhirfix.runs.list({ cursor: page.nextCursor! }) : null;

const corrected = await fhirfix.runs.corrected(runId);
const report = await fhirfix.runs.report(runId, "operationoutcome");
```

## Idempotency

Pass `idempotencyKey` to make a call safe to retry. The same key with the same body replays the original run instead of running and charging again. The same key with a different body is rejected.

```ts
await fhirfix.fix({ input: patientJson, idempotencyKey: "order-1234" });
```

## Errors

Every error extends `FhirfixError`. Failed requests throw an `ApiError` subclass carrying `status`, `code`, `headers`, and the parsed `body`.

```ts
import { OutOfCreditsError, RateLimitError, UnprocessableError } from "fhirfix";

try {
  await fhirfix.fix({ input });
} catch (err) {
  if (err instanceof RateLimitError) {
    await sleep((err.retryAfter ?? 1) * 1000);
  } else if (err instanceof OutOfCreditsError) {
    // add credits or enable auto-recharge
  } else if (err instanceof UnprocessableError) {
    // the input is not a recognized FHIR or HL7v2 shape
  }
}
```

| Class | Status |
| --- | --- |
| `BadRequestError` | 400, 413 |
| `AuthenticationError` | 401 |
| `OutOfCreditsError` | 402 |
| `PermissionDeniedError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `UnprocessableError` | 422 |
| `RateLimitError` | 429 |
| `ServerError` | 5xx |
| `ConnectionError` / `TimeoutError` | no response |

Rate limited (429) and server (5xx) responses are retried automatically with backoff, honouring `Retry-After`. Other errors are not retried, because they fail the same way every time.

## Options

```ts
new Fhirfix({
  apiKey: "ffx_live_...",
  baseUrl: "https://api.fhirfix.dev/api/v1",
  timeoutMs: 120_000,
  maxRetries: 2,
  fetch: customFetch,
});
```
