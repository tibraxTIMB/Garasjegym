-- STURMKOPF FEUER 1.1 – production catalog capture (READ ONLY).
-- Run in Supabase SQL Editor and export the result sets to a protected local file.
-- Contains schema definitions and security metadata only; no application row data.
-- Never commit an actual production capture, credentials, Auth data or user PII.

-- 1. Base tables and RLS flags.
SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY c.relname;

-- 2. Exact column contract.
SELECT table_name, ordinal_position, column_name, data_type, udt_name,
       is_nullable, column_default, is_identity, is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. Constraints and their definitions.
SELECT cl.relname AS table_name, con.conname AS constraint_name,
       con.contype AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_constraint con
JOIN pg_class cl ON cl.oid = con.conrelid
JOIN pg_namespace n ON n.oid = cl.relnamespace
WHERE n.nspname = 'public'
ORDER BY cl.relname, con.conname;

-- 4. Index definitions, including predicates and uniqueness.
SELECT t.relname AS table_name, i.relname AS index_name,
       x.indisunique AS is_unique, x.indisprimary AS is_primary,
       pg_get_indexdef(i.oid) AS definition
FROM pg_index x
JOIN pg_class t ON t.oid = x.indrelid
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
ORDER BY t.relname, i.relname;

-- 5. RLS policy definitions.
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Non-internal triggers.
SELECT c.relname AS table_name, t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 7. Public function definitions and security attributes.
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_get_function_result(p.oid) AS result_type,
       l.lanname AS language, p.prosecdef AS security_definer,
       p.provolatile AS volatility, p.proconfig AS function_settings,
       pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);

-- 8. Public views and definitions.
SELECT c.relname AS view_name,
       coalesce(array_to_string(c.reloptions, ','), '') AS view_options,
       pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v'
ORDER BY c.relname;

-- 9. Extensions and installed versions.
SELECT e.extname AS extension_name, e.extversion AS installed_version,
       n.nspname AS extension_schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY e.extname;

-- 10. Direct grants on public tables, sequences and routines.
SELECT grantee, table_name, privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
ORDER BY grantee, table_name, privilege_type;

SELECT grantee, object_name AS sequence_name, privilege_type, is_grantable
FROM information_schema.usage_privileges
WHERE object_schema = 'public'
ORDER BY grantee, object_name, privilege_type;

SELECT routine_name, specific_name, grantee, privilege_type, is_grantable
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
ORDER BY routine_name, specific_name, grantee, privilege_type;
