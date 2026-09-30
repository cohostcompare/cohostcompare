-- CoHostCompare 014: plans, SMS alerts, suburb reports.
-- Run once in Supabase after 012 and 013: SQL Editor -> New query -> paste -> Run.

-- Plan: null/free, 'pro' or 'enterprise' (set by admin until billing exists). pro_until (from 012) ends a plan or founding trial.
alter table public.managers add column if not exists plan text check (plan in ('free', 'pro', 'enterprise'));
alter table public.managers add column if not exists price_locked_until timestamptz;

-- SMS alerts (Pro): the mobile to text, and whether alerts are on.
alter table public.managers add column if not exists sms_mobile  text;
alter table public.managers add column if not exists sms_enabled boolean not null default false;

-- Suburb report preferences.
alter table public.managers add column if not exists report_emails boolean not null default true;
alter table public.managers add column if not exists report_follow text[] not null default '{}';  -- extra area slugs

create table if not exists public.sms_log (
  id          uuid primary key default gen_random_uuid(),
  manager_id  uuid references public.managers (id) on delete set null,
  to_mobile   text not null,
  kind        text not null,
  ok          boolean not null,
  detail      text,
  created_at  timestamptz not null default now()
);
alter table public.sms_log enable row level security;
revoke all on public.sms_log from anon, authenticated;

-- One row per area per quarter; history is kept.
create table if not exists public.suburb_reports (
  id           uuid primary key default gen_random_uuid(),
  area_slug    text not null,
  area_label   text not null,
  period       text not null,                 -- e.g. '2026-Q4'
  data         jsonb not null,
  manager_ids  uuid[] not null default '{}',  -- managers active in the area when it was made
  notified_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (area_slug, period)
);
create index if not exists suburb_reports_managers_idx on public.suburb_reports using gin (manager_ids);
alter table public.suburb_reports enable row level security;
revoke all on public.suburb_reports from anon, authenticated;

notify pgrst, 'reload schema';
