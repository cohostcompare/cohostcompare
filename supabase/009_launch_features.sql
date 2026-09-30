-- CoHostCompare: earnings estimates, verified businesses, manager outreach (run once in Supabase: SQL Editor -> New query -> Run)

-- Cached AirROI market lookups and summaries (keeps estimator costs down)
create table if not exists public.market_cache (
  key         text primary key,          -- 'pt:<lat>,<lng>' -> market, or 'mk:<full name>' -> summary
  data        jsonb not null,
  fetched_at  timestamptz not null default now()
);
alter table public.market_cache enable row level security;
revoke all on public.market_cache from anon, authenticated;

-- Verified business (ABN)
alter table public.managers add column if not exists abn text;
alter table public.managers add column if not exists abn_name text;
alter table public.managers add column if not exists abn_verified_at timestamptz;

-- Manager outreach
create table if not exists public.outreach_contacts (
  id            uuid primary key default gen_random_uuid(),
  manager_id    uuid not null references public.managers (id) on delete cascade,
  email         text not null,
  first_name    text,
  source_url    text not null,             -- where the address is published (Spam Act: conspicuous publication)
  step          int not null default 0,    -- emails sent so far (0-5)
  next_send_at  timestamptz not null default now(),
  status        text not null default 'active' check (status in ('active', 'paused', 'replied', 'claimed', 'unsubscribed', 'bounced', 'finished')),
  last_sent_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (manager_id, email)
);
alter table public.outreach_contacts enable row level security;
revoke all on public.outreach_contacts from anon, authenticated;

create table if not exists public.email_suppressions (
  email       text primary key,
  reason      text not null default 'unsubscribed',
  created_at  timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;
revoke all on public.email_suppressions from anon, authenticated;

-- Make the new tables visible to the website straight away
notify pgrst, 'reload schema';
