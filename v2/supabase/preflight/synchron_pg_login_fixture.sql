-- DISPOSABLE FIXTURE ONLY. Never run this file against any real database.
-- Local CI password is not a production credential.
CREATE ROLE gg_synchron_login LOGIN PASSWORD 'fixture-only' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
GRANT gg_synchron_server TO gg_synchron_login;
