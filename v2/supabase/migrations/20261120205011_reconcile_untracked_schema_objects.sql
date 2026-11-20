-- Record the remaining live-only schema objects in the reproducible STURMKOPF migration chain.
-- Both operations are idempotent; the column and function already exist in the test DB.

ALTER TABLE public.coffee_orders
  ADD COLUMN IF NOT EXISTS staff_comment text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.get_coffee_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_staff boolean;
  v_result jsonb;
begin
  if v_user_id is null or not public.is_active_user() then
    raise exception 'Aktiv medlemskonto krevst for å sjå kaffistatistikk.';
  end if;
  v_staff := public.is_admin_or_manager();

  with filtered_orders as (
    select o.id, o.member_id, o.status, o.total
    from public.coffee_orders o
    where v_staff or o.member_id = v_user_id
  ),
  quantities as (
    select fo.id, fo.status, fo.total,
      coalesce(sum(i.quantity),0)::bigint as quantity
    from filtered_orders fo
    left join public.coffee_order_items i on i.order_id = fo.id
    group by fo.id,fo.status,fo.total
  ),
  popular as (
    select i.product_name as name, sum(i.quantity)::bigint as quantity
    from filtered_orders fo
    join public.coffee_order_items i on i.order_id=fo.id
    where fo.status <> 'cancelled'
    group by i.product_name
    order by sum(i.quantity) desc, i.product_name
  )
  select jsonb_build_object(
    'bought',coalesce(sum(quantity) filter(where status='collected'),0),
    'made',coalesce(sum(quantity) filter(where status in ('ready','collected')),0),
    'sold',coalesce(sum(quantity) filter(where status='collected'),0),
    'revenue',coalesce(sum(total) filter(where status='collected'),0),
    'popular',coalesce((select jsonb_agg(jsonb_build_object('name',name,'quantity',quantity)) from popular),'[]'::jsonb)
  )
  into v_result
  from quantities;
  return v_result;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_coffee_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coffee_stats() TO authenticated;
