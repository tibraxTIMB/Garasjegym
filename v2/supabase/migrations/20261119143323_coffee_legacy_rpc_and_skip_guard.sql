-- Keep the earlier RPC contract safe, and serialize review vs. skip decisions per order line.

create or replace function public.place_coffee_order(p_items jsonb,p_note text default '')
returns uuid
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.place_coffee_order_v2(p_items,p_note,null);
$$;

revoke all on function public.place_coffee_order(jsonb,text) from public,anon;
grant execute on function public.place_coffee_order(jsonb,text) to authenticated;

create or replace function public.skip_coffee_product_review(p_order_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_member_id uuid;
  v_status text;
  v_skipped_at timestamptz;
begin
  if v_uid is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst.';
  end if;

  select o.member_id,o.status,oi.review_skipped_at
    into v_member_id,v_status,v_skipped_at
  from public.coffee_order_items oi
  join public.coffee_orders o on o.id=oi.order_id
  where oi.id=p_order_item_id
  for update of oi,o;

  if not found or v_member_id<>v_uid or v_status<>'collected' then
    return false;
  end if;
  if v_skipped_at is not null then return false; end if;
  if exists(select 1 from public.coffee_product_reviews r where r.order_item_id=p_order_item_id) then
    return false;
  end if;

  update public.coffee_order_items
    set review_skipped_at=now()
    where id=p_order_item_id and review_skipped_at is null;

  return found;
end;
$$;

revoke all on function public.skip_coffee_product_review(uuid) from public,anon;
grant execute on function public.skip_coffee_product_review(uuid) to authenticated;
