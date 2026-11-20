-- This function is invoked only by the coffee-order status trigger.
-- It must not be exposed as a callable PostgREST RPC.
revoke execute on function public.notify_coffee_order_ready() from public;
revoke execute on function public.notify_coffee_order_ready() from anon, authenticated;

comment on function public.notify_coffee_order_ready() is
  'Trigger-only notification handler for coffee order status changes; client RPC execution is revoked.';
