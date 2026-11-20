-- READ-ONLY acceptance queries for a disposable isolated restore rehearsal.
-- Run only against the restored target, never against production as a migration.
-- This file performs SELECTs only and emits aggregate counts/statuses, no member PII.

with data_counts(check_name, observed_value) as (
  select 'profiles', count(*)::text from public.profiles
  union all select 'classes', count(*)::text from public.classes
  union all select 'class_bookings', count(*)::text from public.class_bookings
  union all select 'pt_sessions', count(*)::text from public.pt_sessions
  union all select 'pt_bookings', count(*)::text from public.pt_bookings
  union all select 'pt_client_notes', count(*)::text from public.pt_client_notes
  union all select 'pt_messages', count(*)::text from public.pt_messages
  union all select 'pt_requests', count(*)::text from public.pt_requests
  union all select 'wods', count(*)::text from public.wods
  union all select 'workout_logs', count(*)::text from public.workout_logs
  union all select 'workout_exercises', count(*)::text from public.workout_exercises
  union all select 'workout_sets', count(*)::text from public.workout_sets
  union all select 'personal_records', count(*)::text from public.personal_records
  union all select 'social_posts', count(*)::text from public.social_posts
  union all select 'social_comments', count(*)::text from public.social_comments
  union all select 'auth_users', count(*)::text from auth.users
  union all select 'auth_identities', count(*)::text from auth.identities
  union all select 'auth_sessions', count(*)::text from auth.sessions
  union all select 'storage_buckets', count(*)::text from storage.buckets
  union all select 'storage_objects', count(*)::text from storage.objects
),
integrity as (
  select 'profiles_without_auth_user' as check_name, count(*)::text as observed_value
  from public.profiles p left join auth.users u on u.id=p.id where u.id is null
  union all
  select 'auth_users_without_profile', count(*)::text
  from auth.users u left join public.profiles p on p.id=u.id where p.id is null
  union all
  select 'personal_records_without_workout_log', count(*)::text
  from public.personal_records where workout_log_id is null
  union all
  select 'personal_records_with_workout_log', count(*)::text
  from public.personal_records where workout_log_id is not null
  union all
  select 'profiles_with_invalid_role', count(*)::text
  from public.profiles where role not in ('admin','manager','member')
),
rls as (
  select 'public_base_tables_with_rls_disabled' as check_name, count(*)::text as observed_value
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r' and not c.relrowsecurity
),
security_definer as (
  select 'public_security_definer_without_fixed_search_path' as check_name, count(*)::text as observed_value
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef
    and not coalesce('search_path='=any(coalesce(p.proconfig, array[]::text[])), false)
),
columns as (
  select 'profiles.email' as check_name,
    case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='email') then 'PRESENT' else 'MISSING' end as observed_value
  union all select 'profiles.membership_status',
    case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='membership_status') then 'PRESENT' else 'MISSING' end
  union all select 'classes.published',
    case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='classes' and column_name='published') then 'PRESENT' else 'MISSING' end
  union all select 'classes.instructor_id',
    case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='classes' and column_name='instructor_id') then 'PRESENT' else 'MISSING' end
  union all select 'class_bookings.attendance_status',
    case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='class_bookings' and column_name='attendance_status') then 'PRESENT' else 'MISSING' end
  union all select 'workout_logs.result_data',
    case when exists(select 1 from information_schema.columns where table_schema='public' and table_name='workout_logs' and column_name='result_data') then 'PRESENT' else 'MISSING' end
)
select 'data_count' as category, check_name, observed_value from data_counts
union all select 'integrity', check_name, observed_value from integrity
union all select 'rls', check_name, observed_value from rls
union all select 'security', check_name, observed_value from security_definer
union all select 'schema_contract', check_name, observed_value from columns
order by category, check_name;
