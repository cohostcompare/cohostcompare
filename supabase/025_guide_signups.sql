-- CoHostCompare 025: setup guide sign-ups (owners swap an email for the downloadable setup guide).
-- Applied by Claude through the Supabase connector on 3 Oct 2026 (no need to run again).
create table if not exists public.guide_signups (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  email         text not null,
  first_name    text,
  state         text not null,
  consent       boolean not null default false,   -- ticked "send me a few short emails"
  consent_text  text,
  source        text,
  step          int not null default 0,           -- follow-up emails sent (consent only)
  next_at       timestamptz,
  downloads     int not null default 0
);
create index if not exists guide_signups_email_idx on public.guide_signups (lower(email));
create index if not exists guide_signups_next_idx on public.guide_signups (next_at) where consent;
alter table public.guide_signups enable row level security;
revoke all on public.guide_signups from anon, authenticated;
notify pgrst, 'reload schema';
