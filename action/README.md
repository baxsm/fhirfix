# FHIRfix Action

Fail a build when FHIR resources have conformance problems. Findings appear as annotations on the pull request diff, with the suggested fix.

## Usage

```yaml
name: FHIR
on: [pull_request]

jobs:
  conformance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: fhirfix/fhirfix-action@v1
        with:
          path: "fhir/**/*.json"
          api-key: ${{ secrets.FHIRFIX_API_KEY }}
```

Get an API key from the developers page of your workspace and store it as a repository secret. Never inline it.

## Inputs

| Input | Default | Description |
| --- | --- | --- |
| `path` | `**/*.json` | File or glob to check. Space-separate multiple globs. |
| `api-key` | required | A FHIRfix API key. Pass it from a secret. |
| `command` | `validate` | `validate`, `fix`, or `convert`. |
| `fail-on` | `error` | Fail the build on `error`, `warning`, or `info`. |
| `profile` | | Profile URL to validate against. Space-separate multiple. |
| `base-url` | | API base url. Only for a self-hosted deployment. |
| `version` | `latest` | Version of `@fhirfix/cli` to run. |
| `annotations` | `true` | Annotate the PR diff with each finding. |
| `working-directory` | `.` | Directory to resolve the path glob from. |

## Outputs

| Output | Description |
| --- | --- |
| `passed` | `true` when no finding met the threshold. |
| `error-count` | Number of error-severity findings. |
| `warning-count` | Number of warning-severity findings. |

## Examples

Gate on warnings too, against a specific profile:

```yaml
- uses: fhirfix/fhirfix-action@v1
  with:
    path: "fhir/*.json"
    api-key: ${{ secrets.FHIRFIX_API_KEY }}
    fail-on: warning
    profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
```

Report findings without failing the build:

```yaml
- uses: fhirfix/fhirfix-action@v1
  id: fhir
  continue-on-error: true
  with:
    path: "fhir/*.json"
    api-key: ${{ secrets.FHIRFIX_API_KEY }}

- run: echo "Found ${{ steps.fhir.outputs.error-count }} errors"
```

Check a directory that is generated during the build:

```yaml
- run: npm run build:fhir
- uses: fhirfix/fhirfix-action@v1
  with:
    path: "*.json"
    working-directory: ./dist/fhir
    api-key: ${{ secrets.FHIRFIX_API_KEY }}
```

## Failure modes

The step fails with a message that distinguishes your files from our service:

- Conformance findings at or above `fail-on`. The annotations say what and where.
- The key was rejected, or the workspace is out of credits.
- The API was unreachable. This does not mean your files are wrong.
- The path glob matched no files, which usually means the path input is wrong.
