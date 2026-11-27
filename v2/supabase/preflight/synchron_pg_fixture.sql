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

-- Existing notification-center column contract, synthetic fixture only.
CREATE TABLE public.notifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),recipient_id uuid NOT NULL REFERENCES public.profiles(id),
 title text NOT NULL,body text NOT NULL,category text NOT NULL CHECK(category IN ('general','coffee','booking','pt','community','system')),
 href text,is_read boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
 requires_ack boolean NOT NULL DEFAULT false,requires_action boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),dedupe_key text
);
CREATE UNIQUE INDEX notifications_recipient_dedupe_idx ON public.notifications(recipient_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Match the production RLS boundary for the restricted server-role rehearsal.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wods ENABLE ROW LEVEL SECURITY;
