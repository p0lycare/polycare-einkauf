#!/usr/bin/env bash
# Spielt Stub, Migrationen und Tests in eine frische Datenbank ein.
# Verbindung über die üblichen PG*-Variablen (PGHOST, PGPORT, PGUSER, …).
set -euo pipefail
cd "$(dirname "$0")/.."
db="einkauf_test_$$"
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$db" -f tests/supabase-stub.sql
for m in migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$db" -f "$m"
done
for t in tests/workflow.sql tests/angebote.sql tests/periode_kopieren.sql tests/team_nur_mitglieder.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$db" -o /dev/null -f "$t"
done
