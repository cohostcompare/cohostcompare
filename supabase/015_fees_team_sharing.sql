-- CoHostCompare 015: success fees (Free plan), team logins, quote templates, account-sharing checks.
-- Run once in Supabase after 014: SQL Editor -> New query -> paste -> Run.

-- A$199 + GST when an owner accepts a Free-plan manager's quote. Invoiced by hand until billing exists.
create table if not exists public.success_fees (
  id          uuid primary key default gen_random_uuid(),
  manager_id  uuid not null references public.managers (id) on delete cascade,
  thread_id   uuid not null unique references public.quote_request_managers (id) on delete cascade,
  amount      numeric not null,           -- A$ excluding GST
  status      text not null default 'owed' check (status in ('owed', 'invoiced', 'paid', 'waived')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.success_fees enable row level security;
revoke all on public.success_fees from anon, authenticated;

-- Team invites (Pro: up to 5 logins, Enterprise: unlimited, Free: 1).
create table if not exists public.manager_invites (
  id           uuid primary key default gen_random_uuid(),
  manager_id   uuid not null references public.managers (id) on delete cascade,
  email        text not null,
  invited_by   uuid,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.manager_invites enable row level security;
revoke all on public.manager_invites from anon, authenticated;

-- Saved quote templates (Pro).
alter table public.managers add column if not exists quote_templates jsonb not null default '[]';

-- Sign-in activity for manager accounts: device and approximate location per day (IP stored only as a hash).
create table if not exists public.account_activity (
  user_id   uuid not null,
  day       date not null default (now() at time zone 'Australia/Sydney')::date,
  ip_hash   text not null,
  ua_hash   text not null,
  device    text,
  city      text,
  region    text,
  country   text,
  hits      int not null default 1,
  last_at   timestamptz not null default now(),
  primary key (user_id, day, ip_hash, ua_hash)
);
alter table public.account_activity enable row level security;
revoke all on public.account_activity from anon, authenticated;

create table if not exists public.account_flags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  manager_id  uuid references public.managers (id) on delete cascade,
  reason      text not null,
  status      text not null default 'open' check (status in ('open', 'ok', 'actioned')),
  created_at  timestamptz not null default now()
);
alter table public.account_flags enable row level security;
revoke all on public.account_flags from anon, authenticated;

notify pgrst, 'reload schema';
