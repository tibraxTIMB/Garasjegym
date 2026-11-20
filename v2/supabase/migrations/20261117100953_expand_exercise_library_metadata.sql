alter table public.exercises add column if not exists body_area text not null default 'Fullkropp';
alter table public.exercises add column if not exists description text not null default '';
alter table public.exercises add column if not exists is_rehab boolean not null default false;
create index if not exists exercises_category_body_area_idx on public.exercises(category,body_area) where is_active=true;
