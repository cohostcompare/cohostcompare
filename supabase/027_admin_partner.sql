-- CoHostCompare 027: admin visibility (email failures, bounces, daily run status, device type) and partner offer review.
-- Run once in Supabase after 026: SQL Editor -> New query -> paste -> Run. Safe to run again.
-- Everything here is read and written by the server only (secret key), so RLS is on with no public policies.

-- 1. Emails Resend refused or that bounced/complained later (src/lib/email.ts, /api/inbound). Shown on /admin.
create table if not exists public.email_failures (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  to_domain   text,            -- recipient's domain only, never the address or body
  subject     text,
  status      text,            -- HTTP status from Resend, 'fetch' when the request itself failed, 'bounced', 'complained'
  detail      text
);
create index if not exists email_failures_created_idx on public.email_failures (created_at desc);
alter table public.email_failures enable row level security;
revoke all on public.email_failures from anon, authenticated;

-- 2. Each daily cron run (src/lib/reminders.ts runDaily): /admin shows the last one and warns when it's overdue.
create table if not exists public.cron_runs (
  id           bigserial primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean,
  summary      text,
  error        text
);
create index if not exists cron_runs_started_idx on public.cron_runs (started_at desc);
alter table public.cron_runs enable row level security;
revoke all on public.cron_runs from anon, authenticated;

-- 3. Device type on visits and funnel events ('phone' | 'tablet' | 'desktop'), from the user agent only.
alter table public.funnel_events add column if not exists device text;

-- 4. Partner offers: approved partners' edits wait for review instead of going live; record the fee terms they accepted.
alter table public.partners add column if not exists pending_review    boolean not null default false;
alter table public.partners add column if not exists pending_offer     jsonb;   -- { offer_title, offer_body, offer_url, promo_code } awaiting approval
alter table public.partners add column if not exists agreed_fee_terms  text;    -- the fee_terms shown when the partner accepted the agreement

notify pgrst, 'reload schema';
