-- Add internal staff response to coffee orders; customer request remains in note.
alter table public.coffee_orders add column if not exists staff_comment text not null default '';
