-- Candidate: not a production migration. Test with active member, inactive member,
-- authorized manager and anon before approval. Never reuse unrelated settings tables.
begin;
create table public.garage_equipment_inventory (
 equipment_key text primary key check (length(equipment_key) between 1 and 160 and equipment_key=lower(btrim(equipment_key))),
 equipment_label text not null check (length(btrim(equipment_label)) between 1 and 160),
 available integer not null check (available between 0 and 999),
 updated_at timestamptz not null default now(),
 updated_by uuid default auth.uid() references public.profiles(id) on delete set null
);
alter table public.garage_equipment_inventory enable row level security;
revoke all on public.garage_equipment_inventory from public,anon,authenticated;
grant select,insert,update on public.garage_equipment_inventory to authenticated;
create policy inventory_read_active on public.garage_equipment_inventory for select to authenticated using ((select public.is_active_user()));
create policy inventory_insert_staff on public.garage_equipment_inventory for insert to authenticated with check ((select public.is_active_user()) and (select public.is_admin_or_manager()) and updated_by=(select auth.uid()));
create policy inventory_update_staff on public.garage_equipment_inventory for update to authenticated using ((select public.is_active_user()) and (select public.is_admin_or_manager())) with check ((select public.is_active_user()) and (select public.is_admin_or_manager()) and updated_by=(select auth.uid()));
commit;
