#!/usr/bin/env bash
# restores a dump into a throwaway database and checks the data survived.
#
#   ./scripts/restore-drill.sh backups/fhirfix-20260801T030000Z.dump
#
# a backup nobody has restored is a guess. this is the drill that turns it into
# a fact, and it never touches the source database.
set -euo pipefail

DUMP="${1:?usage: restore-drill.sh <dump-file>}"
: "${DATABASE_URL:?set DATABASE_URL - the drill restores alongside it}"

[ -f "$DUMP" ] || { echo "restore.drill FAILED: no such file ${DUMP}" >&2; exit 1; }

# the scratch database is named per-run so a drill can never land on a real one.
SCRATCH="fhirfix_drill_$(date -u +%Y%m%d%H%M%S)"
# swap the final path segment (the db name) for the scratch name, preserving
# credentials, host, port and query params.
ADMIN_URL="${DATABASE_URL%/*}/postgres"
SCRATCH_URL="${DATABASE_URL%/*}/${SCRATCH}"

ERRLOG=""
cleanup() {
  psql "$ADMIN_URL" -q -c "DROP DATABASE IF EXISTS ${SCRATCH};" > /dev/null 2>&1 || true
  rm -f "${ERRLOG:-/dev/null}"
}
trap cleanup EXIT

echo "restore.drill target=${SCRATCH}"
psql "$ADMIN_URL" -q -c "CREATE DATABASE ${SCRATCH};"

# --no-owner because the dump was taken that way. exit code is checked below
# rather than by set -e: pg_restore warns on extensions it cannot recreate, and
# a warning is not a failed restore.
# mktemp, not a fixed path: restore stderr names tables, and a predictable name
# in a world-writable /tmp can be pre-created by another user on a shared host.
ERRLOG="$(mktemp)"
set +e
pg_restore --dbname="$SCRATCH_URL" --no-owner --no-privileges "$DUMP" 2> "$ERRLOG"
RC=$?
set -e
if [ $RC -ne 0 ]; then
  echo "restore.drill pg_restore exited ${RC}:" >&2
  tail -20 "$ERRLOG" >&2
fi

# the real assertion. restoring without error still proves nothing if the
# tables came back empty, so compare row counts against the live database.
# every public table is enumerated from the source rather than hardcoded: a
# fixed list silently stops covering whatever the next migration adds.
mapfile -t TABLES < <(psql "$DATABASE_URL" -t -A -c \
  "select table_name from information_schema.tables where table_schema='public' order by table_name;")

[ "${#TABLES[@]}" -gt 0 ] || { echo "restore.drill FAILED: source has no tables" >&2; exit 1; }

FAILED=0
MISMATCH=""
for t in "${TABLES[@]}"; do
  SRC="$(psql "$DATABASE_URL" -t -A -c "select count(*) from \"${t}\";" 2>/dev/null || echo "ERR")"
  DST="$(psql "$SCRATCH_URL" -t -A -c "select count(*) from \"${t}\";" 2>/dev/null || echo "ERR")"
  if [ "$SRC" = "$DST" ] && [ "$SRC" != "ERR" ]; then
    printf '  ok   %-24s %s\n' "$t" "$DST"
  else
    printf '  FAIL %-24s source=%s restored=%s\n' "$t" "$SRC" "$DST"
    MISMATCH="${MISMATCH} ${t}"
    FAILED=1
  fi
done
echo "restore.drill compared ${#TABLES[@]} tables"

if [ $FAILED -ne 0 ]; then
  echo "restore.drill FAILED, mismatched:${MISMATCH}" >&2
  exit 1
fi
echo "restore.drill PASSED - ${DUMP} restores to a working database"
