-- CoHostCompare quote requests (run once in Supabase: SQL Editor -> New query -> Run)
-- Owners can read their own requests. All writes go through the website's server.

create table if not exists public.quote_requests (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references auth.users (id) on delete cascade,
  owner_email      text not null,
  owner_name       text,
  owner_phone      text,
  address          text,
  postcode         text check (postcode ~ '^[0-9]{4}$'),
  property_type    text,
  bedrooms         int check (bedrooms between 0 and 20),
  currently_listed text,
  services         text[] not null default '{}',
  start_timing     text,
  notes            text check (char_length(notes) <= 2000),
  created_at       timestamptz not null default now()
);

create table if not exists public.quote_request_managers (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.quote_requests (id) on delete cascade,
  manager_slug  text not null,
  manager_name  text not null,
  status        text not null default 'sent' check (status in ('sent','viewed','quoted','accepted','declined','withdrawn')),
  quote         jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (request_id, manager_slug)
);
create index if not exists qrm_manager_idx on public.quote_request_managers (manager_slug);

alter table public.quote_requests enable row level security;
alter table public.quote_request_managers enable row level security;

grant select on public.quote_requests, public.quote_request_managers to authenticated;

drop policy if exists "Owners read their requests" on public.quote_requests;
create policy "Owners read their requests" on public.quote_requests
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "Owners read their request managers" on public.quote_request_managers;
create policy "Owners read their request managers" on public.quote_request_managers
  for select to authenticated using (
    exists (select 1 from public.quote_requests r where r.id = request_id and r.owner_id = auth.uid())
  );
