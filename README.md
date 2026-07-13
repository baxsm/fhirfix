# FHIRfix

Turn a wall of FHIR conformance errors into a ranked, plain-language remediation report with concrete fixes and auto-corrected FHIR.

Point FHIRfix at HL7v2 messages or FHIR resources. It converts, validates against US Core / USCDI / Da Vinci profiles, ranks and deduplicates the findings, explains each in plain English, applies the safe deterministic fixes, and re-verifies to clean. Billed per-check via prepaid credits. A CMS-0057-F conformance packet is available as a premium capability.

## Setup

Requires Node 20+, Bun, a Postgres connection string, a Redis URL, and Docker (for the validator and converter services).

```
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, auth secret, and provider keys
docker compose up -d   # postgres, redis, fhir-validator, fhir-converter
npm install
npm run dev
```

The FHIR validator service loads US Core packages on first boot and takes a few seconds to become ready; the app queues checks until it reports healthy.

## License

Proprietary.
