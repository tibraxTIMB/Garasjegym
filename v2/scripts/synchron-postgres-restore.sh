#!/usr/bin/env bash
# CI fixture only. Never accepts production URLs, database names or passwords.
set -euo pipefail
: "${FIXTURE_CONTAINER:?disposable CI container required}"
[[ "$PGPASSWORD" == "fixture-only" ]] || exit 1
source_db=gg_synchron_fixture
restored_db=gg_synchron_restored
p() { psql -X -qAt -h 127.0.0.1 -p 5432 -U postgres -d "$1" -v ON_ERROR_STOP=1 -c "$2"; }
[[ "$(p "$source_db" "SELECT current_database()")" == "$source_db" ]] || exit 1
# Do not export files off the disposable service, or upload database artifacts.
docker exec "$FIXTURE_CONTAINER" pg_dump -U postgres -Fc -d "$source_db" -f /tmp/synchron-fixture.pgbackup
docker exec "$FIXTURE_CONTAINER" pg_restore --list /tmp/synchron-fixture.pgbackup >/dev/null
docker exec "$FIXTURE_CONTAINER" createdb -U postgres "$restored_db"
docker exec "$FIXTURE_CONTAINER" pg_restore -U postgres --exit-on-error -d "$restored_db" /tmp/synchron-fixture.pgbackup
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
# Canonical content fingerprints, never emit raw member/session rows.
for db in "$source_db" "$restored_db"; do
  for table in public.profiles public.pt_coaches public.pt_client_assignments public.wods public.workout_logs public.notifications auth.sessions gg_synchron_private.sessions gg_synchron_private.slots gg_synchron_private.outbox; do
    printf '%s ' "$table" >> "$scratch/$db"
    p "$db" "SELECT count(*) || ':' || md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),'')) FROM $table t" >> "$scratch/$db"
  done
  # RLS policy definitions, relation/column ACLs, function owners and function ACLs.
  p "$db" "SELECT md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY to_jsonb(x)::text),'')) FROM (SELECT * FROM pg_policies WHERE schemaname IN ('public','auth','gg_synchron_private')) x" >> "$scratch/$db"
  p "$db" "SELECT md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY to_jsonb(x)::text),'')) FROM (SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl,pg_get_userbyid(c.relowner) owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','gg_synchron_private') AND c.relkind='r') x" >> "$scratch/$db"
  p "$db" "SELECT md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY to_jsonb(x)::text),'')) FROM (SELECT n.nspname,c.relname,a.attname,a.attacl FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','gg_synchron_private') AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped) x" >> "$scratch/$db"
  p "$db" "SELECT md5(coalesce(string_agg(to_jsonb(x)::text,E'\\n' ORDER BY to_jsonb(x)::text),'')) FROM (SELECT p.proname,pg_get_function_identity_arguments(p.oid) args,p.prosecdef,p.proacl,pg_get_userbyid(p.proowner) owner,pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='gg_synchron_private') x" >> "$scratch/$db"
done
diff -u "$scratch/$source_db" "$scratch/$restored_db"
# Replay access boundaries on the restored schema. The database role objects
# are shared within this disposable cluster; this does not prove role backup.
p "$restored_db" "SELECT has_schema_privilege('authenticated','gg_synchron_private','USAGE') OR has_schema_privilege('anon','gg_synchron_private','USAGE') OR has_function_privilege('authenticated','gg_synchron_private.save_own_result(uuid,uuid)','EXECUTE')" | grep -qx f
psql -X -qAt -h 127.0.0.1 -p 5432 -U gg_synchron_login -d "$restored_db" -v ON_ERROR_STOP=1 -c "BEGIN; SET LOCAL ROLE gg_synchron_server; SELECT gg_synchron_private.session_active('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'); ROLLBACK" | grep -qx t
if psql -X -qAt -h 127.0.0.1 -p 5432 -U gg_synchron_login -d "$restored_db" -v ON_ERROR_STOP=1 -c 'SELECT * FROM auth.sessions' >/dev/null 2>&1; then
  echo 'Unexpected raw Auth access after restore' >&2
  exit 1
fi
echo 'SYNTHETIC SYNCHRON RESTORE VERIFIED — NOT A PRODUCTION DATABUNKER RESTORE'
