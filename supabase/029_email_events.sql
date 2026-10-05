-- CoHostCompare 029: opens and clicks on emails we send (Resend webhook events email.opened / email.clicked, /api/inbound).
-- Applied 6 Oct 2026. Safe to run again. Shown per contact on /admin/outreach. Purged after 180 days by the daily run.
create table if not exists public.email_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  email_id    text,             -- Resend email id
  to_email    text not null,    -- recipient (lower case)
  kind        text not null,    -- 'opened' | 'clicked'
  subject     text,
  link        text              -- the link clicked, without tracking parameters
);
create index if not exists email_events_to_idx on public.email_events (to_email, created_at desc);
create index if not exists email_events_created_idx on public.email_events (created_at desc);
alter table public.email_events enable row level security;
revoke all on public.email_events from anon, authenticated;

notify pgrst, 'reload schema';
