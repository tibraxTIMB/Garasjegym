-- GarasjeGym 2.0 coffee bar tables and secure order RPC
create table if not exists public.coffee_products (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 description text not null default '',
 price numeric(10,2) not null check(price >= 0),
 is_active boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.coffee_orders (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id),
 status text not null default 'new' check(status in ('new','preparing','ready','collected','cancelled')),
 total numeric(10,2) not null default 0 check(total >= 0),
 note text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.coffee_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.coffee_orders(id) on delete cascade,
 product_id uuid references public.coffee_products(id),
 product_name text not null,
 unit_price numeric(10,2) not null check(unit_price >= 0),
 quantity integer not null check(quantity between 1 and 20),
 created_at timestamptz not null default now()
);
alter table public.coffee_products enable row level security;
alter table public.coffee_orders enable row level security;
alter table public.coffee_order_items enable row level security;

drop policy if exists coffee_products_read on public.coffee_products;
create policy coffee_products_read on public.coffee_products for select to authenticated
using ((is_active = true and is_active_user()) or is_admin_or_manager());
drop policy if exists coffee_products_staff_all on public.coffee_products;
create policy coffee_products_staff_all on public.coffee_products for all to authenticated
using (is_admin_or_manager()) with check (is_admin_or_manager());

drop policy if exists coffee_orders_read_own_or_staff on public.coffee_orders;
create policy coffee_orders_read_own_or_staff on public.coffee_orders for select to authenticated
using (is_active_user() and (member_id = auth.uid() or is_admin_or_manager()));
drop policy if exists coffee_orders_staff_update on public.coffee_orders;
create policy coffee_orders_staff_update on public.coffee_orders for update to authenticated
using (is_active_user() and is_admin_or_manager())
with check (is_active_user() and is_admin_or_manager());

drop policy if exists coffee_items_read_via_order on public.coffee_order_items;
create policy coffee_items_read_via_order on public.coffee_order_items for select to authenticated
using (exists(select 1 from public.coffee_orders o where o.id=order_id and is_active_user() and (o.member_id=auth.uid() or is_admin_or_manager())));
drop policy if exists coffee_items_staff_update on public.coffee_order_items;
create policy coffee_items_staff_update on public.coffee_order_items for all to authenticated
using (is_admin_or_manager()) with check (is_admin_or_manager());

create or replace function public.place_coffee_order(p_items jsonb, p_note text default '')
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_uid uuid := auth.uid();
 v_order uuid;
 v_item jsonb;
 v_product public.coffee_products%rowtype;
 v_qty integer;
 v_total numeric(10,2) := 0;
begin
 if v_uid is null or not public.is_active_user() then raise exception 'Aktiv medlemskonto krevst.'; end if;
 if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Vel minst eitt produkt.'; end if;
 if jsonb_array_length(p_items)>20 then raise exception 'For mange produktlinjer.'; end if;
 insert into public.coffee_orders(member_id,note,total) values(v_uid,coalesce(p_note,''),0) returning id into v_order;
 for v_item in select value from jsonb_array_elements(p_items) loop
   v_qty := (v_item->>'quantity')::integer;
   if v_qty < 1 or v_qty > 20 then raise exception 'Ugyldig tal på produkt.'; end if;
   select * into v_product from public.coffee_products where id=(v_item->>'product_id')::uuid and is_active=true for share;
   if not found then raise exception 'Eit produkt er ikkje lenger tilgjengeleg.'; end if;
   insert into public.coffee_order_items(order_id,product_id,product_name,unit_price,quantity)
   values(v_order,v_product.id,v_product.name,v_product.price,v_qty);
   v_total := v_total + v_product.price*v_qty;
 end loop;
 update public.coffee_orders set total=v_total where id=v_order;
 return v_order;
end $$;
revoke all on function public.place_coffee_order(jsonb,text) from public,anon;
grant execute on function public.place_coffee_order(jsonb,text) to authenticated;
