-- CoHostCompare: manager claims, team members, area map (run once in Supabase: SQL Editor -> New query -> Run)

create table if not exists public.manager_members (
  manager_id uuid not null references public.managers (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (manager_id, user_id)
);

create table if not exists public.manager_claims (
  id          uuid primary key default gen_random_uuid(),
  manager_id  uuid not null references public.managers (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null,
  role_title  text,
  phone       text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  method      text check (method in ('email_domain', 'manual')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index if not exists manager_claims_manager_idx on public.manager_claims (manager_id);

alter table public.manager_members enable row level security;
alter table public.manager_claims  enable row level security;
grant select on public.manager_members, public.manager_claims to authenticated;

drop policy if exists "Members see their memberships" on public.manager_members;
create policy "Members see their memberships" on public.manager_members for select to authenticated using (user_id = auth.uid());
drop policy if exists "Claimants see their claims" on public.manager_claims;
create policy "Claimants see their claims" on public.manager_claims for select to authenticated using (user_id = auth.uid());

-- Suburb-level totals for the profile map (aggregated: never individual listings)
create or replace function public.manager_areas(p_manager uuid)
returns table (area text, homes int, lat double precision, lng double precision)
language sql stable as $$
  select coalesce(nullif(l.district, ''), l.locality) as area,
         count(*)::int,
         round(avg(l.lat)::numeric, 2)::double precision,
         round(avg(l.lng)::numeric, 2)::double precision
  from public.managers m
  join public.str_listings l on l.host_id = any (m.airbnb_host_ids) or l.cohost_ids && m.airbnb_host_ids
  where m.id = p_manager and l.lat is not null
  group by 1
  having count(*) >= 2;
$$;
revoke execute on function public.manager_areas(uuid) from public, anon, authenticated;
