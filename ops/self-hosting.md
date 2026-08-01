# Self-hosting FHIRfix

Runs the whole product inside your own network. Protected health data stays on
infrastructure you control.

## What runs

| Service | Image | Purpose |
|---|---|---|
| `frontend` | built from source | Dashboard |
| `backend` | built from source | API, auth, tRPC |
| `worker` | built from source | Queue consumer for runs |
| `validator` | `infernocommunity/fhir-validator-service:v2.3.6` | FHIR profile validation |
| `converter` | `mcr.microsoft.com/healthcareapis/fhir-converter:1.0.476-preview` | HL7 v2 and C-CDA to FHIR |
| `postgres` | `postgres:16-alpine` | Application database |
| `redis` | `redis:7-alpine` | Run queue |

Measured at idle on a 15.6 GB host: about 1.5 GB total, of which the validator
is 940 MB. Most of that is JVM slack, not live data - the validator runs with
`-XX:MaxRAMPercentage=75.0` and sizes its heap against whatever memory it can
see, so it self-adjusts down under a container memory limit. Give the host 8 GB
to leave room for concurrent runs, and raise `VALIDATOR_JAVA_OPTS` if you run
large batches.

## Setup

```bash
cp .env.selfhost.example .env.selfhost
```

Fill in the four required secrets. Each needs a distinct value:

```bash
openssl rand -base64 32
```

- `POSTGRES_PASSWORD`
- `BETTER_AUTH_SECRET`
- `API_KEY_PEPPER` - rotating this invalidates every existing API key
- `WEBHOOK_ENCRYPTION_KEY` - rotating this makes stored webhook secrets unreadable

Then bring it up:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d
```

Apply the schema once, from a machine with the repo checked out:

```bash
DATABASE_URL=postgres://fhirfix:<password>@localhost:5432/fhirfix bun run db:migrate
```

Containers do not migrate themselves. `db/drizzle/` is deliberately not shipped
inside the images, so a running service cannot alter its own schema.

## Serving on a real hostname

`PUBLIC_API_URL` is compiled into the browser bundle at build time, not read at
startup. Changing it requires a rebuild:

```bash
docker compose -f docker-compose.selfhost.yml --env-file .env.selfhost up -d --build frontend
```

Set `APP_URL`, `PUBLIC_API_URL`, `BETTER_AUTH_URL`, and `TRUSTED_ORIGINS` to the
hostnames users actually reach. `TRUSTED_ORIGINS` is the CORS allowlist: a value
that does not match the browser's origin fails every authenticated request.

Terminate TLS at a reverse proxy in front of the two published ports. The
compose file serves plain HTTP and does not manage certificates.

## Terminology

By default the validator resolves codes against the public `tx.fhir.org`. This
sends **codes and value set URLs**, never patient data. For most deployments
that is acceptable and gives the most accurate results.

Where nothing at all may leave the network, choose one:

```bash
# point at a terminology server you run
TX_SERVER_URL=http://your-tx-server/r4

# or skip terminology validation entirely
DISABLE_TX=true
```

`DISABLE_TX=true` is a real tradeoff: invalid codes stop being reported, so a
class of finding disappears from every report. Prefer `TX_SERVER_URL` against
your own server when you can run one.

Verified on 2026-08-01 with `DISABLE_TX=true`: US Core 6.1.0 loads, the
validator reports ready, and validation returns a normal `OperationOutcome`
with no external terminology server reachable.

## Health

```bash
curl http://localhost:3001/health/ready
```

Reports postgres, redis, the validator pool, and the converter. See
[README.md](README.md) for the response format and status semantics. The
dashboard also renders it at `/status`.

## Backups

`scripts/backup-db.sh` and `scripts/restore-drill.sh` work against a self-hosted
database the same way. Point `DATABASE_URL` at it and read
[README.md](README.md) for cadence.

## Notes

- The project name is `fhirfix-selfhost`. The development `docker-compose.yml`
  uses `fhirfix`, and sharing a name would make `down -v` in one delete the
  other's volumes.
- The worker has no HTTP surface. It is a queue consumer, so it has no port and
  no healthcheck; its liveness is visible in `docker compose logs worker`.
- Email is unconfigured by default, so invite and reset links are logged rather
  than sent. Set the `ZEPTOMAIL_*` variables to deliver mail.
- Billing is not wired in a self-hosted deployment. The Polar variables are
  unset, so credit purchase is unavailable.
