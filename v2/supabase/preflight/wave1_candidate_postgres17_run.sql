\set ON_ERROR_STOP on
SET app.sturmkopf_wave0_verified = 'true';
\i v2/supabase/candidates/wave1_membership_auth_production_candidate.sql
\i v2/supabase/preflight/wave1_candidate_postgres17_assertions.sql
