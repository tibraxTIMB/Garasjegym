-- Disposable PostgreSQL 17 fixture approximating only the production objects
-- required by the Wave 1 candidate. This is NOT a Supabase restore.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  role text NOT NULL DEFAULT 'member',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('00000000-0000-0000-0000-000000000001','admin@example.test','{"display_name":"Admin"}'),
 ('00000000-0000-0000-0000-000000000002','member1@example.test','{"display_name":"Member One"}'),
 ('00000000-0000-0000-0000-000000000003','member2@example.test','{"display_name":"Member Two"}');

INSERT INTO public.profiles(id,display_name,role,active) VALUES
 ('00000000-0000-0000-0000-000000000001','Admin','admin',true),
 ('00000000-0000-0000-0000-000000000002','Member One','member',true),
 ('00000000-0000-0000-0000-000000000003','Member Two','member',true);

CREATE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.profiles(id,display_name,role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name',''),
             split_part(COALESCE(NEW.email,''),'@',1)),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

CREATE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=auth.uid() AND p.active=true
  );
$function$;

CREATE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=auth.uid() AND p.active=true AND p.role='admin'
  );
$function$;

CREATE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id=auth.uid() AND p.active=true AND p.role IN ('admin','manager')
  );
$function$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin_or_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_select_own_or_staff ON public.profiles
  FOR SELECT TO authenticated
  USING (id=auth.uid() OR public.is_admin_or_manager());
CREATE POLICY profile_update_staff ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.is_admin_or_manager()
      AND role='member'
      AND id <> (SELECT auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      public.is_admin_or_manager()
      AND role='member'
      AND id <> (SELECT auth.uid())
    )
  );

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO service_role;

-- Minimal production-shaped fixtures for the two cross-member privacy policies.
CREATE TABLE public.class_bookings (
  id uuid PRIMARY KEY,
  class_id uuid NOT NULL,
  member_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL
);
CREATE TABLE public.pt_sessions (
  id uuid PRIMARY KEY,
  client_id uuid REFERENCES public.profiles(id),
  status text NOT NULL
);
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.class_bookings, public.pt_sessions TO authenticated;
CREATE POLICY class_bookings_read_own_or_staff ON public.class_bookings
  FOR SELECT TO authenticated
  USING (
    (public.is_active_user() AND status='confirmed')
    OR (member_id=auth.uid() AND public.is_active_user())
    OR public.is_admin_or_manager()
  );
CREATE POLICY pt_sessions_read ON public.pt_sessions
  FOR SELECT TO authenticated
  USING (
    public.is_active_user()
    AND (public.is_admin_or_manager() OR client_id=auth.uid() OR status='published')
  );
INSERT INTO public.class_bookings(id,class_id,member_id,status) VALUES
 ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','confirmed');
INSERT INTO public.pt_sessions(id,client_id,status) VALUES
 ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','published'),
 ('30000000-0000-0000-0000-000000000002',NULL,'published');

CREATE TABLE public.pt_bookings (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.pt_sessions(id),
  member_id uuid NOT NULL REFERENCES public.profiles(id)
);
INSERT INTO public.pt_sessions(id,client_id,status) VALUES
 ('30000000-0000-0000-0000-000000000003',NULL,'draft');
INSERT INTO public.pt_bookings(id,session_id,member_id) VALUES
 ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002');
