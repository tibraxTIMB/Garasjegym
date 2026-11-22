-- Preserve each member's deliberate display-mode choice across devices.
-- Historic `super_simple_mode = false` is often just a database default.
alter table public.member_preferences
  add column if not exists preferred_display_mode text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.member_preferences'::regclass
      and conname = 'member_preferences_display_mode_choice'
  ) then
    alter table public.member_preferences
      add constraint member_preferences_display_mode_choice
      check (preferred_display_mode is null or preferred_display_mode in ('simple', 'advanced'));
  end if;
end $$;

comment on column public.member_preferences.preferred_display_mode is
  'Explicit choice: simple or advanced. Null means use role-specific default.';
