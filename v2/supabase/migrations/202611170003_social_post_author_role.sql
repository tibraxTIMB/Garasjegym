alter table public.social_posts
  add column if not exists author_role text not null default 'member';

update public.social_posts p
set author_role = coalesce(pr.role, 'member')
from public.profiles pr
where pr.id = p.author_id
  and (p.author_role is null or p.author_role = 'member');
