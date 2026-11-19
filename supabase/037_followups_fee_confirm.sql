-- 037: manager follow-ups after the outreach sequence, and fees a manager confirms from an email link (applied 19 Nov 2026).
alter table public.outreach_contacts add column if not exists fee_asked_at timestamptz, add column if not exists demand_sent_at timestamptz, add column if not exists demand_count integer not null default 0;
alter table public.managers add column if not exists fee_confirmed_at timestamptz;
