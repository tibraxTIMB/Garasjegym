alter table public.coffee_orders add column if not exists archived_at timestamptz;
create index if not exists coffee_orders_archived_created_idx on public.coffee_orders(archived_at,created_at desc);
