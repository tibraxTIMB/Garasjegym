-- TEST ONLY: schema baseline copied without production rows.

create table public.profiles (
  id uuid not null,
  display_name text default ''::text not null,
  avatar_url text,
  role text default 'member'::text not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.exercises (
  id uuid default gen_random_uuid() not null,
  name text not null,
  category text default ''::text not null,
  equipment text default ''::text not null,
  description text default ''::text not null,
  video_url text,
  is_active boolean default true not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.wods (
  id uuid default gen_random_uuid() not null,
  name text not null,
  format text default 'Eigen økt'::text not null,
  duration_minutes integer,
  movements text default ''::text not null,
  notes text default ''::text not null,
  audience text default 'Alle medlemmar'::text not null,
  is_published boolean default true not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.workout_logs (
  id uuid default gen_random_uuid() not null,
  member_id uuid not null,
  source_wod_id uuid,
  title text not null,
  workout_date date default CURRENT_DATE not null,
  format text default 'Fri økt'::text not null,
  rounds integer default 1 not null,
  score_rounds integer,
  score_reps integer,
  note text default ''::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.workout_exercises (
  id uuid default gen_random_uuid() not null,
  workout_log_id uuid not null,
  exercise_id uuid,
  exercise_name text not null,
  source_text text,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.workout_sets (
  id uuid default gen_random_uuid() not null,
  workout_exercise_id uuid not null,
  set_number integer not null,
  reps numeric,
  load_kg numeric,
  time_text text,
  time_seconds numeric,
  created_at timestamp with time zone default now() not null
);

create table public.pt_sessions (
  id uuid default gen_random_uuid() not null,
  client_id uuid,
  created_by uuid not null,
  title text not null,
  starts_at timestamp with time zone not null,
  duration_minutes integer default 60 not null,
  capacity integer default 1 not null,
  price numeric(10,2),
  status text default 'planned'::text not null,
  wod_ids uuid[] default '{}'::uuid[] not null,
  prep text default ''::text not null,
  message text default ''::text not null,
  completed_at timestamp with time zone,
  workout_log_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  custom_workout text default ''::text not null
);

create table public.pt_requests (
  id uuid default gen_random_uuid() not null,
  member_id uuid not null,
  preferred_at timestamp with time zone,
  alternative_at timestamp with time zone,
  availability_note text default ''::text not null,
  goal text default ''::text not null,
  status text default 'pending'::text not null,
  staff_note text default ''::text not null,
  handled_by uuid,
  handled_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.pt_bookings (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  member_id uuid not null,
  status text default 'booked'::text not null,
  note text default ''::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.pt_messages (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  sender_id uuid not null,
  body text not null,
  created_at timestamp with time zone default now() not null
);

create table public.pt_client_notes (
  id uuid default gen_random_uuid() not null,
  client_id uuid not null,
  coach_id uuid not null,
  goals text default ''::text not null,
  note text default ''::text not null,
  follow_up_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.pt_session_exercises (
  id uuid default gen_random_uuid() not null,
  session_id uuid not null,
  sort_order integer default 0 not null,
  phase text default 'main'::text not null,
  exercise_name text not null,
  sets integer,
  reps text default ''::text not null,
  target_load text default ''::text not null,
  rest_seconds integer,
  notes text default ''::text not null,
  created_at timestamp with time zone default now() not null
);

create table public.personal_records (
  id uuid default gen_random_uuid() not null,
  member_id uuid not null,
  exercise_name text not null,
  result text not null,
  unit text default 'kg'::text not null,
  note text,
  record_date date default CURRENT_DATE not null,
  created_at timestamp with time zone default now() not null
);

create table public.classes (
  id uuid default gen_random_uuid() not null,
  title text not null,
  type text default 'Gruppetime'::text not null,
  capacity integer default 6 not null,
  starts_at timestamp with time zone not null,
  duration_minutes integer default 60 not null,
  description text,
  workout_text text,
  wod_ids jsonb default '[]'::jsonb not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.class_bookings (
  id uuid default gen_random_uuid() not null,
  class_id uuid not null,
  member_id uuid not null,
  status text default 'confirmed'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.social_posts (
  id uuid default gen_random_uuid() not null,
  author_id uuid not null,
  author_name text not null,
  body text default ''::text not null,
  topic text default 'Treningsprat'::text not null,
  kind text default 'post'::text not null,
  image_data text,
  reactions jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table public.social_comments (
  id uuid default gen_random_uuid() not null,
  post_id uuid not null,
  author_id uuid not null,
  author_name text not null,
  body text not null,
  created_at timestamp with time zone default now() not null
);

alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'member'::text])));
alter table public.exercises add constraint exercises_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.exercises add constraint exercises_name_key UNIQUE (name);
alter table public.exercises add constraint exercises_pkey PRIMARY KEY (id);
alter table public.wods add constraint wods_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.wods add constraint wods_duration_minutes_check CHECK (((duration_minutes IS NULL) OR (duration_minutes >= 0)));
alter table public.wods add constraint wods_pkey PRIMARY KEY (id);
alter table public.workout_logs add constraint workout_logs_member_id_fkey FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.workout_logs add constraint workout_logs_pkey PRIMARY KEY (id);
alter table public.workout_logs add constraint workout_logs_rounds_check CHECK ((rounds > 0));
alter table public.workout_logs add constraint workout_logs_score_reps_check CHECK (((score_reps IS NULL) OR (score_reps >= 0)));
alter table public.workout_logs add constraint workout_logs_score_rounds_check CHECK (((score_rounds IS NULL) OR (score_rounds >= 0)));
alter table public.workout_logs add constraint workout_logs_source_wod_id_fkey FOREIGN KEY (source_wod_id) REFERENCES wods(id) ON DELETE SET NULL;
alter table public.workout_exercises add constraint workout_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL;
alter table public.workout_exercises add constraint workout_exercises_pkey PRIMARY KEY (id);
alter table public.workout_exercises add constraint workout_exercises_workout_log_id_fkey FOREIGN KEY (workout_log_id) REFERENCES workout_logs(id) ON DELETE CASCADE;
alter table public.workout_sets add constraint workout_sets_pkey PRIMARY KEY (id);
alter table public.workout_sets add constraint workout_sets_set_number_check CHECK ((set_number > 0));
alter table public.workout_sets add constraint workout_sets_workout_exercise_id_fkey FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE;
alter table public.workout_sets add constraint workout_sets_workout_exercise_id_set_number_key UNIQUE (workout_exercise_id, set_number);
alter table public.pt_sessions add constraint pt_sessions_capacity_check CHECK ((capacity > 0));
alter table public.pt_sessions add constraint pt_sessions_client_id_fkey FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.pt_sessions add constraint pt_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table public.pt_sessions add constraint pt_sessions_duration_minutes_check CHECK (((duration_minutes >= 5) AND (duration_minutes <= 600)));
alter table public.pt_sessions add constraint pt_sessions_pkey PRIMARY KEY (id);
alter table public.pt_sessions add constraint pt_sessions_price_check CHECK (((price IS NULL) OR (price >= (0)::numeric)));
alter table public.pt_sessions add constraint pt_sessions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'planned'::text, 'completed'::text, 'cancelled'::text])));
alter table public.pt_sessions add constraint pt_sessions_workout_log_id_fkey FOREIGN KEY (workout_log_id) REFERENCES workout_logs(id) ON DELETE SET NULL;
alter table public.pt_requests add constraint pt_requests_member_id_fkey FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.pt_requests add constraint pt_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'declined'::text, 'cancelled'::text])));
alter table public.pt_requests add constraint pt_requests_pkey PRIMARY KEY (id);
alter table public.pt_requests add constraint pt_requests_handled_by_fkey FOREIGN KEY (handled_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.pt_bookings add constraint pt_bookings_session_id_fkey FOREIGN KEY (session_id) REFERENCES pt_sessions(id) ON DELETE CASCADE;
alter table public.pt_bookings add constraint pt_bookings_member_id_fkey FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.pt_bookings add constraint pt_bookings_pkey PRIMARY KEY (id);
alter table public.pt_bookings add constraint pt_bookings_session_id_member_id_key UNIQUE (session_id, member_id);
alter table public.pt_bookings add constraint pt_bookings_status_check CHECK ((status = ANY (ARRAY['booked'::text, 'cancelled'::text, 'waitlist'::text])));
alter table public.pt_messages add constraint pt_messages_body_check CHECK ((length(TRIM(BOTH FROM body)) > 0));
alter table public.pt_messages add constraint pt_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table public.pt_messages add constraint pt_messages_client_id_fkey FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.pt_messages add constraint pt_messages_pkey PRIMARY KEY (id);
alter table public.pt_client_notes add constraint pt_client_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.pt_client_notes add constraint pt_client_notes_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table public.pt_client_notes add constraint pt_client_notes_pkey PRIMARY KEY (id);
alter table public.pt_session_exercises add constraint pt_session_exercises_phase_check CHECK ((phase = ANY (ARRAY['warmup'::text, 'technique'::text, 'main'::text, 'cooldown'::text])));
alter table public.pt_session_exercises add constraint pt_session_exercises_pkey PRIMARY KEY (id);
alter table public.pt_session_exercises add constraint pt_session_exercises_rest_seconds_check CHECK (((rest_seconds IS NULL) OR (rest_seconds >= 0)));
alter table public.pt_session_exercises add constraint pt_session_exercises_session_id_fkey FOREIGN KEY (session_id) REFERENCES pt_sessions(id) ON DELETE CASCADE;
alter table public.pt_session_exercises add constraint pt_session_exercises_sets_check CHECK (((sets IS NULL) OR (sets > 0)));
alter table public.personal_records add constraint personal_records_member_id_fkey FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.personal_records add constraint personal_records_pkey PRIMARY KEY (id);
alter table public.classes add constraint classes_capacity_check CHECK ((capacity > 0));
alter table public.classes add constraint classes_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table public.classes add constraint classes_pkey PRIMARY KEY (id);
alter table public.class_bookings add constraint class_bookings_class_id_fkey FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE;
alter table public.class_bookings add constraint class_bookings_member_id_fkey FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.class_bookings add constraint class_bookings_pkey PRIMARY KEY (id);
alter table public.class_bookings add constraint class_bookings_status_check CHECK ((status = ANY (ARRAY['confirmed'::text, 'pending'::text, 'cancelled'::text, 'declined'::text])));
alter table public.social_posts add constraint social_posts_pkey PRIMARY KEY (id);
alter table public.social_posts add constraint social_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public.social_comments add constraint social_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES social_posts(id) ON DELETE CASCADE;
alter table public.social_comments add constraint social_comments_pkey PRIMARY KEY (id);
alter table public.social_comments add constraint social_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX class_bookings_one_active ON public.class_bookings USING btree (class_id, member_id) WHERE (status = ANY (ARRAY['confirmed'::text, 'pending'::text]));
CREATE INDEX pt_bookings_member_idx ON public.pt_bookings USING btree (member_id, status);
CREATE INDEX pt_client_notes_client_followup_idx ON public.pt_client_notes USING btree (client_id, follow_up_at);
CREATE INDEX pt_messages_client_created_idx ON public.pt_messages USING btree (client_id, created_at);
CREATE INDEX pt_requests_member_created_idx ON public.pt_requests USING btree (member_id, created_at DESC);
CREATE INDEX pt_requests_status_created_idx ON public.pt_requests USING btree (status, created_at DESC);
CREATE INDEX pt_session_exercises_order_idx ON public.pt_session_exercises USING btree (session_id, sort_order);
CREATE INDEX pt_sessions_status_start_idx ON public.pt_sessions USING btree (status, starts_at);
CREATE INDEX pt_sessions_client_start_idx ON public.pt_sessions USING btree (client_id, starts_at);
CREATE INDEX social_comments_post_id_idx ON public.social_comments USING btree (post_id);
CREATE INDEX social_posts_created_at_idx ON public.social_posts USING btree (created_at DESC);
CREATE INDEX wods_published_idx ON public.wods USING btree (is_published);
CREATE INDEX wods_created_at_idx ON public.wods USING btree (created_at DESC);
CREATE INDEX workout_exercises_log_idx ON public.workout_exercises USING btree (workout_log_id, sort_order);
CREATE INDEX workout_logs_member_date_idx ON public.workout_logs USING btree (member_id, workout_date DESC);
CREATE INDEX workout_sets_exercise_idx ON public.workout_sets USING btree (workout_exercise_id, set_number);

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_active_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.active = true
    );
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.active = true
      and p.role in ('admin', 'manager')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.check_class_booking_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  max_capacity integer;
  active_count integer;
begin
  select capacity into max_capacity
  from public.classes
  where id = new.class_id;

  if max_capacity is null then
    raise exception 'Gruppetimen finst ikkje.';
  end if;

  select count(*) into active_count
  from public.class_bookings
  where class_id = new.class_id
    and status in ('confirmed', 'pending')
    and id is distinct from new.id;

  if new.status in ('confirmed', 'pending')
     and active_count >= max_capacity then
    raise exception 'Denne gruppetimen er full.';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pt_promote_waitlist_after_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_capacity integer;
begin
  if old.status = 'booked' and new.status = 'cancelled' then
    select capacity into v_capacity
    from public.pt_sessions
    where id = new.session_id
    for update;

    if (select count(*) from public.pt_bookings
        where session_id = new.session_id and status = 'booked') < coalesce(v_capacity,0) then
      update public.pt_bookings
      set status = 'booked', updated_at = now()
      where id = (
        select id from public.pt_bookings
        where session_id = new.session_id and status = 'waitlist'
        order by created_at asc limit 1
      );
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.book_pt_session(p_session_id uuid)
 RETURNS TABLE(status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session public.pt_sessions%rowtype;
  v_count integer;
  v_status text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'Du må vere aktivt innlogga for å bestille PT-time.';
  END IF;

  SELECT s.*
  INTO v_session
  FROM public.pt_sessions s
  WHERE s.id = p_session_id
    AND s.status = 'published'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dette PT-tidspunktet er ikkje lenger tilgjengeleg.';
  END IF;

  IF v_session.starts_at <= now() THEN
    RAISE EXCEPTION 'Påmeldingsfristen for denne timen er ute.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pt_bookings b
    WHERE b.session_id = p_session_id
      AND b.member_id = auth.uid()
      AND b.status IN ('booked', 'waitlist')
  ) THEN
    RAISE EXCEPTION 'Du er allereie registrert på dette tidspunktet.';
  END IF;

  SELECT count(*)
  INTO v_count
  FROM public.pt_bookings b
  WHERE b.session_id = p_session_id
    AND b.status = 'booked';

  v_status := CASE
    WHEN v_count < v_session.capacity THEN 'booked'
    ELSE 'waitlist'
  END;

  INSERT INTO public.pt_bookings(session_id, member_id, status)
  VALUES (p_session_id, auth.uid(), v_status)
  ON CONFLICT (session_id, member_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = now();

  RETURN QUERY SELECT v_status;
END;
$function$
;


create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger exercises_set_updated_at before update on public.exercises for each row execute function public.set_updated_at();
create trigger wods_set_updated_at before update on public.wods for each row execute function public.set_updated_at();
create trigger workout_logs_set_updated_at before update on public.workout_logs for each row execute function public.set_updated_at();
create trigger pt_promote_waitlist_after_cancel after update of status on public.pt_bookings for each row execute function public.pt_promote_waitlist_after_cancel();
create trigger class_booking_capacity_check before insert or update of class_id, status on public.class_bookings for each row execute function public.check_class_booking_capacity();
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.wods enable row level security;
alter table public.workout_logs enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.pt_sessions enable row level security;
alter table public.pt_messages enable row level security;
alter table public.pt_requests enable row level security;
alter table public.pt_bookings enable row level security;
alter table public.pt_client_notes enable row level security;
alter table public.pt_session_exercises enable row level security;
alter table public.personal_records enable row level security;
alter table public.classes enable row level security;
alter table public.class_bookings enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_comments enable row level security;

create policy logs_delete_own_or_staff on public.workout_logs for delete to authenticated using ((((member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy exercises_manage_staff on public.exercises for all to authenticated using (is_admin_or_manager()) with check (is_admin_or_manager());
create policy exercises_read_members on public.exercises for select to authenticated using ((((is_active = true) AND is_active_user()) OR is_admin_or_manager()));
create policy wods_manage_staff on public.wods for all to authenticated using (is_admin_or_manager()) with check (is_admin_or_manager());
create policy wods_read_published on public.wods for select to authenticated using ((((is_published = true) AND is_active_user()) OR is_admin_or_manager()));
create policy logs_insert_own on public.workout_logs for insert to authenticated with check ((((member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy logs_read_own_or_staff on public.workout_logs for select to authenticated using ((((member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy logs_update_own_or_staff on public.workout_logs for update to authenticated using ((((member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager())) with check ((((member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy workout_exercises_access_via_log on public.workout_exercises for all to authenticated using ((EXISTS ( SELECT 1
   FROM workout_logs l
  WHERE ((l.id = workout_exercises.workout_log_id) AND (((l.member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()))))) with check ((EXISTS ( SELECT 1
   FROM workout_logs l
  WHERE ((l.id = workout_exercises.workout_log_id) AND (((l.member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager())))));
create policy workout_sets_access_via_log on public.workout_sets for all to authenticated using ((EXISTS ( SELECT 1
   FROM (workout_exercises e
     JOIN workout_logs l ON ((l.id = e.workout_log_id)))
  WHERE ((e.id = workout_sets.workout_exercise_id) AND (((l.member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()))))) with check ((EXISTS ( SELECT 1
   FROM (workout_exercises e
     JOIN workout_logs l ON ((l.id = e.workout_log_id)))
  WHERE ((e.id = workout_sets.workout_exercise_id) AND (((l.member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager())))));
create policy profile_select_own_or_staff on public.profiles for select to authenticated using (((id = auth.uid()) OR is_admin_or_manager()));
create policy pt_sessions_read on public.pt_sessions for select to authenticated using ((is_active_user() AND (is_admin_or_manager() OR (client_id = auth.uid()) OR (status = 'published'::text))));
create policy pt_sessions_staff_insert on public.pt_sessions for insert to authenticated with check ((is_active_user() AND is_admin_or_manager() AND (created_by = auth.uid())));
create policy pt_sessions_staff_update on public.pt_sessions for update to authenticated using ((is_active_user() AND is_admin_or_manager())) with check ((is_active_user() AND is_admin_or_manager()));
create policy pt_sessions_staff_delete on public.pt_sessions for delete to authenticated using ((is_active_user() AND is_admin_or_manager()));
create policy pt_requests_read on public.pt_requests for select to authenticated using ((is_active_user() AND ((member_id = auth.uid()) OR is_admin_or_manager())));
create policy pt_requests_member_insert on public.pt_requests for insert to authenticated with check ((is_active_user() AND (member_id = auth.uid())));
create policy social_comments_delete_own_or_staff on public.social_comments for delete to authenticated using ((((author_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy pt_requests_update on public.pt_requests for update to authenticated using ((is_active_user() AND (is_admin_or_manager() OR ((member_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'cancelled'::text])))))) with check ((is_active_user() AND (is_admin_or_manager() OR ((member_id = auth.uid()) AND (status = ANY (ARRAY['pending'::text, 'cancelled'::text]))))));
create policy pt_bookings_read on public.pt_bookings for select to authenticated using ((is_active_user() AND ((member_id = auth.uid()) OR is_admin_or_manager())));
create policy pt_bookings_insert on public.pt_bookings for insert to authenticated with check ((is_active_user() AND ((member_id = auth.uid()) OR is_admin_or_manager())));
create policy pt_bookings_update on public.pt_bookings for update to authenticated using ((is_active_user() AND ((member_id = auth.uid()) OR is_admin_or_manager()))) with check ((is_active_user() AND ((member_id = auth.uid()) OR is_admin_or_manager())));
create policy pt_bookings_delete on public.pt_bookings for delete to authenticated using ((is_active_user() AND ((member_id = auth.uid()) OR is_admin_or_manager())));
create policy pt_messages_read on public.pt_messages for select to authenticated using ((is_active_user() AND ((client_id = auth.uid()) OR is_admin_or_manager())));
create policy pt_messages_insert on public.pt_messages for insert to authenticated with check ((is_active_user() AND (sender_id = auth.uid()) AND ((client_id = auth.uid()) OR is_admin_or_manager())));
create policy pt_client_notes_staff_all on public.pt_client_notes for all to authenticated using ((is_active_user() AND is_admin_or_manager())) with check ((is_active_user() AND is_admin_or_manager() AND (coach_id = auth.uid())));
create policy pt_session_exercises_read on public.pt_session_exercises for select to authenticated using ((is_active_user() AND (EXISTS ( SELECT 1
   FROM pt_sessions s
  WHERE ((s.id = pt_session_exercises.session_id) AND (is_admin_or_manager() OR (s.client_id = auth.uid()) OR (s.status = 'published'::text)))))));
create policy pt_session_exercises_staff_all on public.pt_session_exercises for all to authenticated using ((is_active_user() AND is_admin_or_manager())) with check ((is_active_user() AND is_admin_or_manager()));
create policy personal_records_read_own_or_staff on public.personal_records for select to authenticated using ((((member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy personal_records_insert_own on public.personal_records for insert to authenticated with check (((member_id = auth.uid()) AND is_active_user()));
create policy personal_records_delete_own_or_staff on public.personal_records for delete to authenticated using ((((member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy classes_read_members on public.classes for select to authenticated using ((is_active_user() OR is_admin_or_manager()));
create policy classes_insert_staff on public.classes for insert to authenticated with check (is_admin_or_manager());
create policy classes_update_staff on public.classes for update to authenticated using (is_admin_or_manager()) with check (is_admin_or_manager());
create policy classes_delete_staff on public.classes for delete to authenticated using (is_admin_or_manager());
create policy class_bookings_insert_own on public.class_bookings for insert to authenticated with check (((member_id = auth.uid()) AND is_active_user() AND (status = ANY (ARRAY['confirmed'::text, 'pending'::text]))));
create policy class_bookings_update_own_or_admin on public.class_bookings for update to authenticated using ((((member_id = auth.uid()) AND is_active_user()) OR is_admin())) with check ((((member_id = auth.uid()) AND is_active_user() AND (status = 'cancelled'::text)) OR is_admin()));
create policy class_bookings_delete_admin on public.class_bookings for delete to authenticated using (is_admin());
create policy class_bookings_read_own_or_staff on public.class_bookings for select to authenticated using (((is_active_user() AND (status = 'confirmed'::text)) OR ((member_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy social_posts_read_members on public.social_posts for select to authenticated using ((is_active_user() OR is_admin_or_manager()));
create policy social_comments_read_members on public.social_comments for select to authenticated using ((is_active_user() OR is_admin_or_manager()));
create policy social_posts_insert_own on public.social_posts for insert to authenticated with check (((author_id = auth.uid()) AND is_active_user()));
create policy social_comments_insert_own on public.social_comments for insert to authenticated with check (((author_id = auth.uid()) AND is_active_user()));
create policy social_posts_delete_own_or_staff on public.social_posts for delete to authenticated using ((((author_id = auth.uid()) AND is_active_user()) OR is_admin_or_manager()));
create policy pt_messages_delete_participants_or_staff on public.pt_messages for delete to authenticated using (((is_active_user() AND ((sender_id = auth.uid()) OR (client_id = auth.uid()))) OR is_admin_or_manager()));
create policy profile_update_staff on public.profiles for update to authenticated using ((is_admin() OR (is_admin_or_manager() AND (role = 'member'::text) AND (id <> ( SELECT auth.uid() AS uid))))) with check ((is_admin() OR (is_admin_or_manager() AND (role = 'member'::text) AND (id <> ( SELECT auth.uid() AS uid)))));

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant usage on schema public to authenticated;