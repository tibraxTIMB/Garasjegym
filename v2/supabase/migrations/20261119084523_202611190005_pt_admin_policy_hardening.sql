
-- Split PT administration policies so another authorized admin can maintain existing records.
drop policy if exists pt_coaches_staff_manage on public.pt_coaches;
create policy pt_coaches_staff_insert on public.pt_coaches for insert to authenticated
with check(public.is_admin_or_manager() and created_by=(select auth.uid()));
create policy pt_coaches_staff_update on public.pt_coaches for update to authenticated
using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
create policy pt_coaches_staff_delete on public.pt_coaches for delete to authenticated
using(public.is_admin_or_manager());

drop policy if exists pt_client_assignments_staff_manage on public.pt_client_assignments;
create policy pt_client_assignments_staff_insert on public.pt_client_assignments for insert to authenticated
with check(public.is_admin_or_manager() and assigned_by=(select auth.uid()));
create policy pt_client_assignments_staff_update on public.pt_client_assignments for update to authenticated
using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
create policy pt_client_assignments_staff_delete on public.pt_client_assignments for delete to authenticated
using(public.is_admin_or_manager());

drop policy if exists pt_services_staff_manage on public.pt_services;
create policy pt_services_staff_insert on public.pt_services for insert to authenticated
with check(public.is_admin_or_manager() and created_by=(select auth.uid()));
create policy pt_services_staff_update on public.pt_services for update to authenticated
using(public.is_admin_or_manager()) with check(public.is_admin_or_manager());
create policy pt_services_staff_delete on public.pt_services for delete to authenticated
using(public.is_admin_or_manager());

create or replace function public.pt_validate_active_coach_assignment()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.status='active' and not exists (
   select 1 from public.pt_coaches c where c.user_id=new.coach_user_id and c.is_active=true
 ) then
   raise exception 'PT-en må vere registrert og aktiv før kunden kan tildelast.';
 end if;
 return new;
end;
$$;
drop trigger if exists pt_validate_active_coach_assignment on public.pt_client_assignments;
create trigger pt_validate_active_coach_assignment before insert or update of coach_user_id,status
on public.pt_client_assignments for each row execute function public.pt_validate_active_coach_assignment();
