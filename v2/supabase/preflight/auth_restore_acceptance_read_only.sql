-- STURMKOPF FEUER 1.1 – Auth recovery acceptance fingerprint (READ ONLY).
-- Run once against production before export, and again against the isolated restore.
-- Compare the returned values offline. This emits no emails, user UUIDs, password
-- hashes, refresh tokens, MFA secrets, identity payloads, or other user PII.
-- Treat the source/restore fingerprint sheet as sensitive operational metadata.

SELECT 'users' AS category, 'row_count' AS check_name, count(*)::text AS observed_value
FROM auth.users
UNION ALL
SELECT 'users', 'user_uuid_set_md5',
       md5(coalesce(string_agg(id::text, ',' ORDER BY id), ''))
FROM auth.users
UNION ALL
SELECT 'users', 'users_with_password_hash',
       count(*) FILTER (WHERE coalesce(encrypted_password, '') <> '')::text
FROM auth.users
UNION ALL
SELECT 'users', 'confirmed_email_users',
       count(*) FILTER (WHERE email_confirmed_at IS NOT NULL)::text
FROM auth.users
UNION ALL
SELECT 'identities', 'row_count', count(*)::text
FROM auth.identities
UNION ALL
SELECT 'identities', 'identity_uuid_set_md5',
       md5(coalesce(string_agg(id::text, ',' ORDER BY id), ''))
FROM auth.identities
UNION ALL
SELECT 'identities', 'identity_link_set_md5',
       md5(coalesce(string_agg(
         user_id::text || ':' || provider || ':' || provider_id,
         ',' ORDER BY user_id, provider, provider_id
       ), ''))
FROM auth.identities
UNION ALL
SELECT 'identities', 'orphan_identity_rows',
       count(*) FILTER (WHERE u.id IS NULL)::text
FROM auth.identities i
LEFT JOIN auth.users u ON u.id = i.user_id
UNION ALL
SELECT 'identities', 'users_without_identity',
       count(*) FILTER (WHERE i.user_id IS NULL)::text
FROM auth.users u
LEFT JOIN auth.identities i ON i.user_id = u.id
UNION ALL
SELECT 'sessions', 'row_count', count(*)::text
FROM auth.sessions
UNION ALL
SELECT 'sessions', 'session_uuid_set_md5',
       md5(coalesce(string_agg(id::text, ',' ORDER BY id), ''))
FROM auth.sessions
UNION ALL
SELECT 'sessions', 'orphan_session_rows',
       count(*) FILTER (WHERE u.id IS NULL)::text
FROM auth.sessions s
LEFT JOIN auth.users u ON u.id = s.user_id
UNION ALL
SELECT 'refresh_tokens', 'row_count', count(*)::text
FROM auth.refresh_tokens
UNION ALL
SELECT 'refresh_tokens', 'orphan_session_links',
       count(*) FILTER (WHERE r.session_id IS NOT NULL AND s.id IS NULL)::text
FROM auth.refresh_tokens r
LEFT JOIN auth.sessions s ON s.id = r.session_id
UNION ALL
SELECT 'mfa_factors', 'row_count', count(*)::text
FROM auth.mfa_factors
UNION ALL
SELECT 'mfa_factors', 'factor_uuid_set_md5',
       md5(coalesce(string_agg(id::text, ',' ORDER BY id), ''))
FROM auth.mfa_factors
UNION ALL
SELECT 'mfa_factors', 'orphan_factor_rows',
       count(*) FILTER (WHERE u.id IS NULL)::text
FROM auth.mfa_factors f
LEFT JOIN auth.users u ON u.id = f.user_id
UNION ALL
SELECT 'sso_providers', 'row_count', count(*)::text
FROM auth.sso_providers
UNION ALL
SELECT 'saml_providers', 'row_count', count(*)::text
FROM auth.saml_providers
ORDER BY category, check_name;

-- Auth-managed trigger inventory. Compare names, target table, function name,
-- security-definer flag and fixed search_path between source and restored target.
SELECT c.relname AS table_name,
       t.tgname AS trigger_name,
       pg_get_triggerdef(t.oid, true) AS trigger_definition,
       n2.nspname AS function_schema,
       p.proname AS function_name,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_namespace n2 ON n2.oid = p.pronamespace
WHERE n.nspname = 'auth'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
