-- The group-class notification trigger uses category='group'.
-- The notification center already supports this category in its icon and
-- group-context rendering; align the database constraint with that contract.

alter table public.notifications
  drop constraint if exists notifications_category_check;

alter table public.notifications
  add constraint notifications_category_check
  check (category in ('general','coffee','booking','pt','community','system','group'));
