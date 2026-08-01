#!/usr/bin/env bash
# full logical backup of the fhirfix database.
#
#   ./scripts/backup-db.sh                      -> backups/fhirfix-<utc>.dump
#   BACKUP_DIR=/mnt/x ./scripts/backup-db.sh    -> writes elsewhere
#
# custom format (-Fc) because it is compressed and pg_restore can filter and
# reorder it. plain sql can only be replayed whole.
set -euo pipefail

: "${DATABASE_URL:?set DATABASE_URL to the database you want to back up}"

BACKUP_DIR="${BACKUP_DIR:-backups}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${BACKUP_DIR}/fhirfix-${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

# --no-owner / --no-privileges so the dump restores into a database whose role
# names differ from production. without them a restore fails on every ALTER OWNER.
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="$OUT"

# a dump that cannot be listed is not a backup. this reads the archive's table
# of contents, which fails loudly on a truncated or corrupt file.
if ! pg_restore --list "$OUT" > /dev/null 2>&1; then
  echo "backup.verify FAILED: ${OUT} is not a readable archive" >&2
  rm -f "$OUT"
  exit 1
fi

SIZE="$(wc -c < "$OUT" | tr -d ' ')"
COUNT="$(pg_restore --list "$OUT" | grep -c 'TABLE DATA' || true)"
echo "backup.ok ${OUT} bytes=${SIZE} tables_with_data=${COUNT}"

# prune old dumps last, so a failure above never deletes a good backup.
find "$BACKUP_DIR" -name 'fhirfix-*.dump' -type f -mtime "+${RETAIN_DAYS}" -delete
echo "backup.pruned older than ${RETAIN_DAYS}d"
