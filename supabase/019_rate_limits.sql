-- CoHostCompare 019: rate limits (earnings estimator).
-- Run once in Supabase after 018: SQL Editor -> New query -> paste -> Run.

create table if not exists public.rate_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  kind        text not null,
  who         text not null,   -- 'u:<user id>' or 'ip:<scrambled IP>'
  item        text             -- e.g. the rounded location estimated
);
create index if not exists rate_events_lookup_idx on public.rate_events (kind, who, created_at desc);
alter table public.rate_events enable row level security;

notify pgrst, 'reload schema';
