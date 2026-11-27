-- Disposable DB only: production-shaped fields, not a real Supabase copy.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,active boolean NOT NULL,membership_status text NOT NULL,role text NOT NULL);
CREATE TABLE public.pt_coaches(user_id uuid PRIMARY KEY,is_active boolean NOT NULL);
CREATE TABLE public.pt_client_assignments(coach_user_id uuid,member_id uuid,status text,PRIMARY KEY(coach_user_id,member_id));
CREATE TABLE public.wods(id uuid PRIMARY KEY,name text,format text,is_published boolean,is_archived boolean,timer_settings jsonb);
