-- Coffee bar extensions: product options, operating state, order timestamps and optional product reviews.
-- Existing orders and menu rows are retained; all new fields have safe defaults.

alter table public.coffee_products
  add column if not exists category text not null default 'Kaffi',
  add column if not exists option_groups jsonb not null default '[]'::jsonb,
  add column if not exists prep_minutes integer,
  add column if not exists image_url text;

alter table public.coffee_products
  drop constraint if exists coffee_products_option_groups_check;
alter table public.coffee_products
  add constraint coffee_products_option_groups_check
  check (jsonb_typeof(option_groups) = 'array');

alter table public.coffee_order_items
  add column if not exists options jsonb not null default '[]'::jsonb,
  add column if not exists review_skipped_at timestamptz;
alter table public.coffee_order_items
  drop constraint if exists coffee_order_items_options_check;
alter table public.coffee_order_items
  add constraint coffee_order_items_options_check
  check (jsonb_typeof(options) = 'array');

alter table public.coffee_orders
  add column if not exists client_request_id uuid,
  add column if not exists confirmed_at timestamptz,
  add column if not exists preparing_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists collected_at timestamptz;

create unique index if not exists coffee_orders_member_request_idx
  on public.coffee_orders(member_id, client_request_id)
  where client_request_id is not null;

alter table public.coffee_orders
  drop constraint if exists coffee_orders_status_check;
alter table public.coffee_orders
  add constraint coffee_orders_status_check
  check (status = any (array['new','confirmed','preparing','ready','collected','cancelled']::text[]));

create table if not exists public.coffee_settings (
  id boolean primary key default true check (id),
  is_open boolean not null default true,
  closed_message text not null default 'Kaffebaren er stengd akkurat no.',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
insert into public.coffee_settings(id,is_open)
values(true,true)
on conflict(id) do nothing;

alter table public.coffee_settings enable row level security;
drop policy if exists coffee_settings_read_active on public.coffee_settings;
create policy coffee_settings_read_active on public.coffee_settings
  for select to authenticated using (public.is_active_user() or public.is_admin_or_manager());
drop policy if exists coffee_settings_staff_manage on public.coffee_settings;
create policy coffee_settings_staff_manage on public.coffee_settings
  for all to authenticated using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

create table if not exists public.coffee_product_reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.coffee_order_items(id) on delete restrict,
  order_id uuid not null references public.coffee_orders(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid references public.coffee_products(id) on delete set null,
  product_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists coffee_product_reviews_created_idx
  on public.coffee_product_reviews(created_at desc);
create index if not exists coffee_product_reviews_product_idx
  on public.coffee_product_reviews(product_id, created_at desc);
create index if not exists coffee_product_reviews_member_idx
  on public.coffee_product_reviews(member_id, created_at desc);

alter table public.coffee_product_reviews enable row level security;
drop policy if exists coffee_reviews_read_own_or_staff on public.coffee_product_reviews;
create policy coffee_reviews_read_own_or_staff on public.coffee_product_reviews
  for select to authenticated
  using (public.is_active_user() and (member_id = auth.uid() or public.is_admin_or_manager()));
-- Reviews are written only through submit_coffee_product_review(); members cannot
-- forge order ownership or create review notifications directly.

create or replace function public.place_coffee_order_v2(
  p_items jsonb,
  p_note text default '',
  p_request_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_order uuid;
  v_item jsonb;
  v_option jsonb;
  v_group jsonb;
  v_product public.coffee_products%rowtype;
  v_qty integer;
  v_options jsonb;
  v_total numeric(10,2) := 0;
  v_open boolean;
begin
  if v_uid is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst.';
  end if;

  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_uid::text || p_request_id::text, 0));
    select id into v_order
      from public.coffee_orders
      where member_id = v_uid and client_request_id = p_request_id;
    if v_order is not null then return v_order; end if;
  end if;

  select is_open into v_open from public.coffee_settings where id = true;
  if coalesce(v_open,true) is false then
    raise exception 'Kaffebaren er stengd akkurat no.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Vel minst eitt produkt.';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'For mange produktlinjer.';
  end if;

  insert into public.coffee_orders(member_id,note,total,client_request_id)
  values(v_uid,coalesce(p_note,''),0,p_request_id)
  returning id into v_order;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then raise exception 'Ugyldig tal på produkt.'; end if;

    select * into v_product
      from public.coffee_products
      where id = (v_item->>'product_id')::uuid and is_active = true
      for share;
    if not found then raise exception 'Eit produkt er ikkje lenger tilgjengeleg.'; end if;

    v_options := coalesce(v_item->'options','[]'::jsonb);
    if jsonb_typeof(v_options) <> 'array' then raise exception 'Ugyldige produktval.'; end if;

    for v_option in select value from jsonb_array_elements(v_options) loop
      if not exists (
        select 1
        from jsonb_array_elements(v_product.option_groups) as g(value)
        where g.value->>'name' = v_option->>'group'
          and coalesce(g.value->'choices','[]'::jsonb) ? (v_option->>'choice')
      ) then
        raise exception 'Eit av produktvala er ikkje lenger tilgjengeleg.';
      end if;
    end loop;

    for v_group in select value from jsonb_array_elements(v_product.option_groups) loop
      if coalesce((v_group->>'required')::boolean,false)
        and not exists (
          select 1 from jsonb_array_elements(v_options) as selected(value)
          where selected.value->>'group' = v_group->>'name'
        ) then
        raise exception 'Vel eit alternativ for %.', v_group->>'name';
      end if;
    end loop;

    insert into public.coffee_order_items(order_id,product_id,product_name,unit_price,quantity,options)
    values(v_order,v_product.id,v_product.name,v_product.price,v_qty,v_options);

    v_total := v_total + v_product.price*v_qty;
  end loop;

  update public.coffee_orders set total=v_total, updated_at=now() where id=v_order;
  return v_order;
end;
$$;

revoke all on function public.place_coffee_order_v2(jsonb,text,uuid) from public, anon;
grant execute on function public.place_coffee_order_v2(jsonb,text,uuid) to authenticated;

create or replace function public.submit_coffee_product_review(
  p_order_item_id uuid,
  p_rating integer,
  p_comment text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_order_id uuid;
  v_member_id uuid;
  v_order_status text;
  v_product_id uuid;
  v_product_name text;
  v_skipped_at timestamptz;
  v_review_id uuid;
  v_comment text := left(trim(coalesce(p_comment,'')),500);
begin
  if v_uid is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst.';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Vel ei vurdering frå 1 til 5 stjerner.';
  end if;

  select o.id,o.member_id,o.status,oi.product_id,oi.product_name,oi.review_skipped_at
    into v_order_id,v_member_id,v_order_status,v_product_id,v_product_name,v_skipped_at
  from public.coffee_order_items oi
  join public.coffee_orders o on o.id = oi.order_id
  where oi.id = p_order_item_id
  for update of oi,o;

  if not found or v_member_id <> v_uid then
    raise exception 'Produktet finst ikkje i dine bestillingar.';
  end if;
  if v_order_status <> 'collected' then
    raise exception 'Du kan vurdera produktet etter at det er utlevert.';
  end if;
  if v_skipped_at is not null then
    raise exception 'Du har valt å hoppa over vurdering av dette produktet.';
  end if;

  insert into public.coffee_product_reviews(
    order_item_id,order_id,member_id,product_id,product_name,rating,comment
  ) values (
    p_order_item_id,v_order_id,v_uid,v_product_id,v_product_name,p_rating,v_comment
  ) returning id into v_review_id;

  insert into public.notifications(
    recipient_id,title,body,category,href,priority,requires_action,status,dedupe_key
  )
  select
    p.id,
    'Ny produktvurdering – ' || v_product_name,
    p_rating::text || ' av 5 stjerner' ||
      case when v_comment <> '' then ' · ' || left(v_comment,180) else '' end ||
      ' · Bestilling #' || upper(left(replace(v_order_id::text,'-',''),8)),
    'coffee',
    'coffee-review:' || v_review_id::text,
    case when p_rating <= 2 then 'high' else 'normal' end,
    false,
    'open',
    'coffee-review:' || v_review_id::text
  from public.profiles p
  where p.active = true
    and p.membership_status = 'approved'
    and p.role in ('admin','manager')
  on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;

  return v_review_id;
end;
$$;

revoke all on function public.submit_coffee_product_review(uuid,integer,text) from public, anon;
grant execute on function public.submit_coffee_product_review(uuid,integer,text) to authenticated;

create or replace function public.skip_coffee_product_review(p_order_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_updated integer;
begin
  if v_uid is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst.';
  end if;

  update public.coffee_order_items oi
    set review_skipped_at = now()
  from public.coffee_orders o
  where oi.id = p_order_item_id
    and o.id = oi.order_id
    and o.member_id = v_uid
    and o.status = 'collected'
    and oi.review_skipped_at is null
    and not exists (
      select 1 from public.coffee_product_reviews r where r.order_item_id = oi.id
    );
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.skip_coffee_product_review(uuid) from public, anon;
grant execute on function public.skip_coffee_product_review(uuid) to authenticated;

create or replace function public.notify_coffee_order_ready()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'ready' and old.status is distinct from 'ready' then
    insert into public.notifications(
      recipient_id,title,body,category,href,priority,requires_action,status,dedupe_key
    ) values (
      new.member_id,
      'Kaffibestillinga di er klar',
      'Du kan henta bestilling #' || upper(left(replace(new.id::text,'-',''),8)) || ' i Kaffebaren.',
      'coffee',
      'kaffi',
      'normal',
      false,
      'open',
      'coffee-order-ready:' || new.id::text
    )
    on conflict (recipient_id,dedupe_key) where dedupe_key is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists coffee_order_ready_notification on public.coffee_orders;
create trigger coffee_order_ready_notification
after update of status on public.coffee_orders
for each row execute function public.notify_coffee_order_ready();
