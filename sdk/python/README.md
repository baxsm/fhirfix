# fhirfix

Python client for the FHIRfix REST API. Validate, fix, and convert FHIR conformance issues.

Python 3.9+. No dependencies.

## Install

```bash
pip install fhirfix
```

## Usage

```python
from fhirfix import Fhirfix

fhirfix = Fhirfix(
    api_key="ffx_test_...",
    base_url="http://localhost:3001/api/v1",
)

result = fhirfix.fix(input=patient_json)

print(result.conformance_score_before, "->", result.conformance_score_after)
print(result.corrected)
```

Both are read from the environment when you do not pass them:

```bash
export FHIRFIX_API_KEY=ffx_test_...
export FHIRFIX_BASE_URL=http://localhost:3001/api/v1
```

`base_url` points at the FHIRfix API you are calling. There is no built-in default, so a client can never silently talk to the wrong host.

### Validate without changing anything

```python
result = fhirfix.validate(input=patient_json)

for finding in result.findings:
    print(finding.severity, finding.plain_message, finding.suggested_fix)
```

### Convert HL7v2 or C-CDA to FHIR

```python
result = fhirfix.convert(input=hl7v2_message)
print(result.fhir)
```

### Large inputs

`batch` queues the work and returns immediately. Poll the run or receive a `run.completed` webhook.

```python
queued = fhirfix.batch(input=big_ndjson)
detail = fhirfix.runs_get(queued.run_id)
```

### Runs

```python
page = fhirfix.runs_list(status="completed", limit=20)
if page.has_more:
    page = fhirfix.runs_list(cursor=page.next_cursor)

corrected = fhirfix.runs_corrected(run_id)
report = fhirfix.runs_report(run_id, "operationoutcome")
pdf = fhirfix.runs_report_bytes(run_id, "pdf")
```

## Idempotency

Pass `idempotency_key` to make a call safe to retry. The same key with the same body replays the original run instead of running and charging again. The same key with a different body is rejected.

```python
fhirfix.fix(input=patient_json, idempotency_key="order-1234")
```

## Errors

Every error inherits from `FhirfixError`. Failed requests raise an `APIError` subclass carrying `status`, `code`, `headers`, and the parsed `body`.

```python
from fhirfix import OutOfCreditsError, RateLimitError, UnprocessableError

try:
    fhirfix.fix(input=patient_json)
except RateLimitError as err:
    time.sleep(err.retry_after or 1)
except OutOfCreditsError:
    ...  # add credits or enable auto-recharge
except UnprocessableError:
    ...  # the input is not a recognized FHIR or HL7v2 shape
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

```python
Fhirfix(
    api_key="ffx_live_...",  # or $FHIRFIX_API_KEY
    base_url="http://localhost:3001/api/v1",  # or $FHIRFIX_BASE_URL. required.
    timeout=120.0,
    max_retries=2,
)
```
