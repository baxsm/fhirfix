# Operations

Backup, restore, and health checking.

## Health endpoints

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /health` | Liveness. The process answers. Railway's `healthcheckPath` points here. | none |
| `GET /health/ready` | Readiness. Probes postgres, redis, the validator pool, and the converter. | none |

`/health/ready` follows `draft-inadarei-api-health-check-06` and responds with
`application/health+json`.

- `pass` -> HTTP 200, every dependency responded.
- `warn` -> HTTP 200, reduced capacity. Some validator instances are down but
  the pool still serves runs.
- `fail` -> HTTP 503, at least one dependency is unreachable.

Liveness deliberately does not touch the database. A deploy that cannot reach
postgres should still boot and report why, rather than being killed and
restarted forever.

Probe results are cached for 15 seconds. The endpoint is public, so without the
cache each caller would become a sidecar probe.

## Backups

```bash
DATABASE_URL=postgres://... ./scripts/backup-db.sh
```

Writes `backups/fhirfix-<utc>.dump` in pg_dump custom format (`-Fc`), taken with
`--no-owner --no-privileges` so it restores into a database whose role names
differ from production.

Every backup is verified by reading its table of contents before it is kept. A
dump that cannot be listed is deleted and the script exits non-zero, so a
corrupt file never sits in the backup directory looking like a backup.

Overrides: `BACKUP_DIR` (default `backups`), `RETAIN_DAYS` (default `30`).
Pruning runs last, so a failed backup never deletes a good one.

**Cadence:** daily, retained 30 days. Dumps contain PHI in full. They are
gitignored, and belong in encrypted storage with access limited to whoever holds
the production database credential.

## Restore drill

```bash
DATABASE_URL=postgres://... ./scripts/restore-drill.sh backups/fhirfix-<utc>.dump
```

Restores into a uniquely-named scratch database, compares row counts for every
table in the source schema, then drops the scratch database on exit.

The table list is read from `information_schema` rather than hardcoded, so it
keeps covering whatever the next migration adds. The source database is only
ever read.

**Cadence:** monthly, and after any schema migration that rewrites a table.

A restore that completes without error still proves nothing if the tables came
back empty, which is why the drill asserts counts rather than exit codes.

### Drill of 2026-08-01

Ran against the development database: 27 tables, all row counts matched
(`run` 260, `audit_log_entry` 951, `credit_ledger_entry` 466, `organization`
298, `stored_object` 534).

Verified the drill can fail: re-run against a deliberately truncated dump, it
reported 23 mismatched tables and exited non-zero.

## Restoring for real

The drill restores to a scratch database. To restore production:

```bash
createdb fhirfix_restored
pg_restore --dbname=postgres://.../fhirfix_restored --no-owner --no-privileges <dump>
psql postgres://.../fhirfix_restored -c "ANALYZE;"
```

`ANALYZE` matters: a dump carries no planner statistics, so the first queries
against a fresh restore pick bad plans until it runs.

Point the application at the restored database by changing `DATABASE_URL`,
rather than renaming databases underneath a running service.

## Migrations

Generated with `drizzle-kit generate` and applied with `drizzle-kit migrate`
from an operator machine over the public proxy URL. `db/drizzle/` is not
vendored into the deployed containers, so a running service cannot migrate
itself. Take a backup before applying a migration that drops or rewrites a
column.
