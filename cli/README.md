# @fhirfix/cli

Command line tool for [FHIRfix](https://fhirfix.dev). Validate, fix, and convert FHIR from a terminal or a CI pipeline.

## Install

```bash
npm install -g @fhirfix/cli
```

Or run it without installing:

```bash
npx @fhirfix/cli validate ./bundle.json
```

## Usage

```bash
export FHIRFIX_API_KEY=ffx_test_...

fhirfix validate ./bundle.json
fhirfix validate ./out/*.json --fail-on warning
fhirfix fix ./patient.json --write
fhirfix convert ./adt.hl7 --out ./patient.json
```

`validate` reports findings and changes nothing. `fix` applies safe fixes and returns the corrected artifact. `convert` turns HL7v2 or C-CDA into FHIR.

## Options

| Flag | Description |
| --- | --- |
| `--api-key <key>` | API key. Defaults to `$FHIRFIX_API_KEY`. |
| `--base-url <url>` | API base url. Defaults to `$FHIRFIX_BASE_URL` or the public API. |
| `--fail-on <level>` | Fail on `error`, `warning`, or `info`. Default: `error`. |
| `--profile <url>` | Validate against a profile. Repeatable. |
| `--out <file>` | Write the corrected output to a file. Single input only. |
| `--write` | Rewrite each input file in place. |
| `--redact` | Redact PHI from the corrected output. |
| `--json` | Emit machine-readable json. |
| `--github` | Emit GitHub Actions annotations and a job summary. |
| `--quiet`, `-q` | Only print the summary line. |

## Exit codes

A build gate scripts against these.

| Code | Meaning |
| --- | --- |
| 0 | No findings at or above `--fail-on`. |
| 1 | Findings found. The gate tripped. |
| 2 | Usage error (bad flag, unreadable file). |
| 3 | Auth failed: missing, invalid, or unscoped key. |
| 4 | Out of credits. |
| 5 | The API was unreachable, timed out, or is rate limiting. |
| 6 | The input is not valid FHIR or HL7v2, or it is too large. |

Only exit 1 means "your FHIR has problems". Everything else means the check could not run, so a pipeline can tell a real failure from an outage.

## In CI

```yaml
- run: npx @fhirfix/cli validate ./fhir/*.json
  env:
    FHIRFIX_API_KEY: ${{ secrets.FHIRFIX_API_KEY }}
```

For inline PR annotations, use the action instead:

```yaml
- uses: fhirfix/fhirfix-action@v1
  with:
    path: ./fhir/*.json
    api-key: ${{ secrets.FHIRFIX_API_KEY }}
```

## JSON output

```bash
fhirfix validate ./bundle.json --json | jq '.files[].findings[] | select(.severity == "error")'
```
