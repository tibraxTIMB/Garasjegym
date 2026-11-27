-- Disposable DB only: production-shaped fields, not a real Supabase copy.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,active boolean NOT NULL,membership_status text NOT NULL,role text NOT NULL);
CREATE TABLE public.pt_coaches(user_id uuid PRIMARY KEY,is_active boolean NOT NULL);
CREATE TABLE public.pt_client_assignments(coach_user_id uuid,member_id uuid,status text,PRIMARY KEY(coach_user_id,member_id));
CREATE TABLE public.wods(id uuid PRIMARY KEY,name text,format text,is_published boolean,is_archived boolean,timer_settings jsonb);

-- Minimal existing workout_logs column contract; not the actual production schema.
CREATE TABLE public.workout_logs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES public.profiles(id), save_token uuid,
 source_wod_id uuid, class_live_session_id uuid, title text NOT NULL, workout_date date NOT NULL, format text NOT NULL,
 rounds integer NOT NULL, score_rounds integer, score_reps integer, score_time_seconds numeric, score_load_kg numeric,
 score_calories numeric, score_distance numeric, score_unit text, result_data jsonb NOT NULL, note text
);
CREATE UNIQUE INDEX workout_logs_member_save_token_uidx ON public.workout_logs(member_id,save_token) WHERE save_token IS NOT NULL;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
