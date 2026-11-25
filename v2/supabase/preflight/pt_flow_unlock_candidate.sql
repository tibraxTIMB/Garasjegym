-- Candidate SQL, not applied. Promote via reviewed migration after isolated database replay.
-- Existing plans remain open and no existing rows are deleted.
alter table public.pt_programs add column flow_unlock_mode text not null default 'open' check (flow_unlock_mode in ('open','sequence','date'));
alter table public.pt_program_sessions add column flow_requires_approval boolean not null default false,
 add column flow_approved boolean not null default false,
 add column flow_override boolean not null default false;

-- Security invoker: existing RLS limits all data to the caller's own/authorized plans.
create function public.pt_flow_can_start(p_session_id uuid) returns boolean
language plpgsql stable security invoker set search_path = pg_catalog,public,app_private
as $$
declare s public.pt_program_sessions%rowtype; p public.pt_programs%rowtype;
begin
 if auth.uid() is null or not public.is_active_user() then return false; end if;
 select * into s from public.pt_program_sessions where id=p_session_id;
 if not found or s.archived_at is not null or s.session_kind in ('rest','information') or s.status not in ('planned','in_progress') then return false; end if;
 select * into p from public.pt_programs where id=s.program_id;
 if not found or p.archived_at is not null or p.status<>'active' then return false; end if;
 if p.client_id<>auth.uid() and not public.is_admin_or_manager() and not app_private.is_pt_coach_for_member(p.client_id) then return false; end if;
 if s.flow_override or p.flow_unlock_mode='open' then return true; end if;
 if p.flow_unlock_mode='date' then return coalesce(s.scheduled_date <= (statement_timestamp() at time zone 'Europe/Oslo')::date,false); end if;
 return not exists (
 select 1 from public.pt_program_sessions q
 where q.program_id=s.program_id and q.archived_at is null and q.session_kind not in ('rest','information')
 and (coalesce(q.week_no,1),coalesce(q.day_no,1),coalesce(q.sequence_no,0),q.id) < (coalesce(s.week_no,1),coalesce(s.day_no,1),coalesce(s.sequence_no,0),s.id)
 and (q.status<>'completed' or (q.flow_requires_approval and not q.flow_approved))
 );
end;
$$;
revoke all on function public.pt_flow_can_start(uuid) from public,anon;
grant execute on function public.pt_flow_can_start(uuid) to authenticated;

-- Serialize plan changes with session transitions. A conflicting transaction can fail rather than bypass a lock.
create function app_private.pt_flow_plan_guard() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public,app_private as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('pt-flow:'||old.id::text,0));
 if new.flow_unlock_mode is distinct from old.flow_unlock_mode then
  if auth.uid() is null or not public.is_active_user() or not (public.is_admin_or_manager() or app_private.is_pt_coach_for_member(old.client_id)) then
   raise exception 'Berre ansvarleg PT kan endra opplåsing.';
  end if;
 end if;
 return new;
end;$$;
create trigger pt_flow_plan_guard before update on public.pt_programs for each row execute function app_private.pt_flow_plan_guard();

create function app_private.pt_flow_session_guard() returns trigger
language plpgsql security invoker set search_path=pg_catalog,public,app_private as $$
declare p public.pt_programs%rowtype; coach boolean; pid uuid;
begin
 if tg_op='DELETE' then pid:=old.program_id; else pid:=new.program_id; end if;
 perform pg_advisory_xact_lock(hashtextextended('pt-flow:'||pid::text,0));
 if tg_op='DELETE' then return old; end if;
 select * into p from public.pt_programs where id=pid;
 if not found then raise exception 'PT-planen finst ikkje.'; end if;
 coach:=coalesce(auth.uid() is not null and public.is_active_user() and (public.is_admin_or_manager() or app_private.is_pt_coach_for_member(p.client_id)),false);
 if tg_op='INSERT' then
  if (new.flow_requires_approval or new.flow_approved or new.flow_override) and not coach then raise exception 'Berre ansvarleg PT kan endra opplåsing.'; end if;
  if p.flow_unlock_mode<>'open' and new.status in ('in_progress','completed') then raise exception 'Ny PT-økt må vera planlagd.'; end if;
 else
  if new.program_id is distinct from old.program_id then raise exception 'PT-økt kan ikkje bytast til ein annan plan.'; end if;
  if (new.flow_requires_approval is distinct from old.flow_requires_approval or new.flow_approved is distinct from old.flow_approved or new.flow_override is distinct from old.flow_override) and not coach then raise exception 'Berre ansvarleg PT kan endra opplåsing.'; end if;
  if new.flow_approved and not old.flow_approved and (old.status<>'completed' or not old.flow_requires_approval) then raise exception 'Berre fullført økt med krav om godkjenning kan godkjennast.'; end if;
  if p.flow_unlock_mode<>'open' and old.status in ('planned','in_progress') and new.status in ('in_progress','completed')
   and (new.status is distinct from old.status or new.workout_log_id is distinct from old.workout_log_id)
   and not public.pt_flow_can_start(old.id) then raise exception 'PT-økta er låst. Oppdater treningsplanen eller kontakt PT.'; end if;
 end if;
 return new;
end;$$;
create trigger pt_flow_session_guard before insert or update or delete on public.pt_program_sessions for each row execute function app_private.pt_flow_session_guard();
-- Trigger-only functions must not be exposed as RPCs.
revoke all on function app_private.pt_flow_plan_guard() from public,anon,authenticated;
revoke all on function app_private.pt_flow_session_guard() from public,anon,authenticated;
