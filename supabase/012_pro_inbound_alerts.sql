-- CoHostCompare 012: Pro plan (founding access), interest sign-ups, owner search demand, email reply tracking, error alerts.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- Pro plan. Pro never changes search order, ratings or the quote comparison: it only adds tools for the manager.
alter table public.managers add column if not exists pro_until timestamptz;
alter table public.managers add column if not exists pro_note  text;

-- Managers who have already claimed get six months of Pro free as founding managers.
update public.managers set pro_until = now() + interval '6 months', pro_note = 'founding'
where claimed and pro_until is null;

-- Interest sign-ups: Pro, suburb reports, partner businesses.
create table if not exists public.interest_signups (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('pro', 'report', 'partner')),
  email       text not null,
  name        text,
  manager_id  uuid references public.managers (id) on delete set null,
  area        text,
  note        text,
  created_at  timestamptz not null default now()
);
create unique index if not exists interest_signups_once on public.interest_signups (kind, lower(email), coalesce(area, ''));
alter table public.interest_signups enable row level security;
revoke all on public.interest_signups from anon, authenticated;

-- Owner searches by postcode per day (no addresses, no people): powers "owner demand" for managers.
create table if not exists public.search_log (
  day       date not null default (now() at time zone 'Australia/Sydney')::date,
  postcode  text not null,
  suburb    text,
  count     int not null default 0,
  primary key (day, postcode)
);
alter table public.search_log enable row level security;
revoke all on public.search_log from anon, authenticated;

create or replace function public.log_search(p_postcode text, p_suburb text)
returns void language sql as $$
  insert into public.search_log (day, postcode, suburb, count)
  values ((now() at time zone 'Australia/Sydney')::date, p_postcode, p_suburb, 1)
  on conflict (day, postcode) do update set count = public.search_log.count + 1, suburb = coalesce(excluded.suburb, public.search_log.suburb);
$$;
revoke execute on function public.log_search(text, text) from public, anon, authenticated;

-- Emails received by reply tracking (one row per email, so webhook retries are ignored).
create table if not exists public.inbound_emails (
  email_id    text primary key,
  from_email  text,
  to_address  text,
  subject     text,
  outcome     text,
  created_at  timestamptz not null default now()
);
alter table public.inbound_emails enable row level security;
revoke all on public.inbound_emails from anon, authenticated;

-- Server errors, grouped, so alerts go out at most every few hours per error.
create table if not exists public.error_events (
  sig              text primary key,
  route            text,
  message          text,
  count            int not null default 1,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  last_alerted_at  timestamptz
);
alter table public.error_events enable row level security;
revoke all on public.error_events from anon, authenticated;

notify pgrst, 'reload schema';
