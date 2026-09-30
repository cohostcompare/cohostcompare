-- CoHostCompare: counts of profile views and search appearances for the manager dashboard
-- (run once in Supabase: SQL Editor -> New query -> Run). One row per manager, kind and day.

create table if not exists public.manager_events (
  manager_id  uuid not null references public.managers (id) on delete cascade,
  kind        text not null check (kind in ('view', 'search')),
  day         date not null default (now() at time zone 'Australia/Sydney')::date,
  count       int not null default 0,
  primary key (manager_id, kind, day)
);
alter table public.manager_events enable row level security;
revoke all on public.manager_events from anon, authenticated;

create or replace function public.bump_manager_events(p_ids uuid[], p_kind text)
returns void language sql as $$
  insert into public.manager_events (manager_id, kind, day, count)
  select id, p_kind, (now() at time zone 'Australia/Sydney')::date, 1 from unnest(p_ids) as id
  on conflict (manager_id, kind, day) do update set count = public.manager_events.count + 1;
$$;
revoke execute on function public.bump_manager_events(uuid[], text) from public, anon, authenticated;

notify pgrst, 'reload schema';
