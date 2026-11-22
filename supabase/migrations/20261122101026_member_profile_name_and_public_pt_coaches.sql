-- Let members edit their own display name, without granting a way to change
-- membership status, roles or other profile data through a crafted API call.
create policy profile_update_own_display_name
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create or replace function public.guard_own_profile_name_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) = old.id and old.role <> 'admin' then
    if (to_jsonb(new) - 'display_name' - 'updated_at')
       is distinct from (to_jsonb(old) - 'display_name' - 'updated_at') then
      raise exception 'Du kan berre endra ditt eige visingsnamn';
    end if;
    if length(btrim(new.display_name)) < 2 or length(btrim(new.display_name)) > 80 then
      raise exception 'Namnet må vera mellom 2 og 80 teikn';
    end if;
    new.display_name := btrim(new.display_name);
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger guard_own_profile_name_edit_trigger
  before update on public.profiles
  for each row execute function public.guard_own_profile_name_edit();

-- Coach names are intentionally publishable, while private profile fields
-- (email, member rank, membership state) must remain behind profile RLS.
alter table public.pt_coaches add column public_name text not null default '';
update public.pt_coaches c
set public_name = coalesce(nullif(btrim(p.display_name), ''), 'PT i GarasjeGym')
from public.profiles p
where p.id = c.user_id;
