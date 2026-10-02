-- CoHostCompare 022: owner extras (unsent request reminders, new-manager alerts), manager onboarding emails,
-- and tracking request emails to unclaimed managers.
-- Run once in Supabase after 021: SQL Editor -> New query -> paste -> Run.

-- Owners who opened the quote form with managers picked but didn't send (one reminder).
create table if not exists public.quote_drafts (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  managers     text not null,          -- comma-separated slugs
  names        text,                   -- manager names, for the email
  query        text not null,          -- address part of the /quote link
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  reminded_at  timestamptz,
  done         boolean not null default false
);
alter table public.quote_drafts enable row level security;

-- "Email me when new managers start covering this property".
alter table public.quote_requests add column if not exists watch_new boolean not null default false;
alter table public.quote_requests add column if not exists known_slugs text[];
alter table public.quote_requests add column if not exists watch_checked_at timestamptz;

-- Manager onboarding emails after claiming (0 = none sent yet).
alter table public.managers add column if not exists onboarding_step int not null default 0;
alter table public.managers add column if not exists onboarding_at timestamptz;
-- Managers who claimed more than two weeks ago are past onboarding, so they don't get the series all at once.
update public.managers m set onboarding_step = 3
where m.onboarding_step = 0
  and exists (select 1 from public.manager_members mm where mm.manager_id = m.id and mm.created_at < now() - interval '14 days');

-- When we emailed an unclaimed manager about a request (so the daily run can catch up on missed ones).
alter table public.quote_request_managers add column if not exists unclaimed_notified_at timestamptz;

notify pgrst, 'reload schema';
