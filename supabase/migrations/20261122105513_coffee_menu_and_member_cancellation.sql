-- Starter menu for an empty coffee bar. Never overwrite an existing custom menu.
-- Garasjen has not provided prices; 0 kr preserves the existing free-coffee setup.
do $$
begin
  if not exists (select 1 from public.coffee_products) then
    insert into public.coffee_products
      (name, description, price, category, option_groups, prep_minutes, sort_order, is_active)
    values
      ('Espresso', 'Liten, konsentrert kaffi med fyldig smak.', 0, 'Espresso', '[]'::jsonb, 2, 10, true),
      ('Doppio', 'Dobbel espresso for deg som vil ha meir kaffismak.', 0, 'Espresso', '[]'::jsonb, 2, 20, true),
      ('Long black', 'Varmt vatn med espresso på toppen.', 0, 'Espresso', '[]'::jsonb, 3, 30, true),
      ('Americano', 'Espresso blanda med varmt vatn.', 0, 'Espresso', '[]'::jsonb, 3, 40, true),
      ('Cortado', 'Espresso med ei lita mengd varm mjølk.', 0, 'Mjølkekaffi', '[{"name":"Mjølk","required":true,"choices":["Vanleg mjølk","Havremjølk","Laktosefri mjølk"]}]'::jsonb, 4, 50, true),
      ('Cappuccino', 'Espresso med mjølk og mjølkeskum.', 0, 'Mjølkekaffi', '[{"name":"Mjølk","required":true,"choices":["Vanleg mjølk","Havremjølk","Laktosefri mjølk"]}]'::jsonb, 4, 60, true),
      ('Flat white', 'Espressobasert kaffi med fint mjølkeskum.', 0, 'Mjølkekaffi', '[{"name":"Mjølk","required":true,"choices":["Vanleg mjølk","Havremjølk","Laktosefri mjølk"]}]'::jsonb, 4, 70, true),
      ('Caffè latte', 'Mild espresso med mykje varm mjølk.', 0, 'Mjølkekaffi', '[{"name":"Mjølk","required":true,"choices":["Vanleg mjølk","Havremjølk","Laktosefri mjølk"]},{"name":"Smak","required":false,"choices":["Vanilje","Karamell"]}]'::jsonb, 4, 80, true),
      ('Mocha', 'Espresso, sjokolade og varm mjølk.', 0, 'Mjølkekaffi', '[{"name":"Mjølk","required":true,"choices":["Vanleg mjølk","Havremjølk","Laktosefri mjølk"]}]'::jsonb, 5, 90, true),
      ('Varm sjokolade', 'Varm sjokoladedrikk utan espresso.', 0, 'Utan kaffi', '[{"name":"Mjølk","required":true,"choices":["Vanleg mjølk","Havremjølk","Laktosefri mjølk"]}]'::jsonb, 4, 100, true),
      ('Te', 'Ein kopp varm te. Skriv gjerne ønskja type i kommentarfeltet.', 0, 'Utan kaffi', '[]'::jsonb, 3, 110, true);
  end if;
end;
$$;

-- A member can retract a request only while it is new or confirmed.
-- The trigger closes the otherwise broad UPDATE access that RLS grants to a row.
create or replace function public.guard_member_coffee_cancel()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The existing SECURITY DEFINER ordering RPC updates the total after insert.
  -- It runs as its database owner and must remain able to do so.
  if current_user = 'authenticated'
    and (select auth.uid()) = old.member_id
    and not public.is_admin_or_manager() then
    if old.status not in ('new', 'confirmed')
      or new.status <> 'cancelled'
      or (to_jsonb(new) - 'status' - 'updated_at')
         is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
      raise exception 'Du kan berre avbestilla før tilbereding.';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger coffee_orders_member_cancel_guard
before update on public.coffee_orders
for each row execute function public.guard_member_coffee_cancel();

create policy coffee_orders_member_cancel
on public.coffee_orders
for update to authenticated
using (
  public.is_active_user()
  and member_id = (select auth.uid())
  and status in ('new', 'confirmed')
)
with check (
  public.is_active_user()
  and member_id = (select auth.uid())
  and status = 'cancelled'
);
