alter table public.pt_requests
  add column if not exists archived_at timestamptz;

create index if not exists pt_requests_member_archived_created_idx
  on public.pt_requests (member_id, archived_at, created_at desc);
