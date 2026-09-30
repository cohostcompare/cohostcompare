-- CoHostCompare 016: owner situation on quote requests, Stripe billing, pay-to-unlock on the Free plan.
-- Run once in Supabase after 015: SQL Editor -> New query -> paste -> Run.

alter table public.quote_requests add column if not exists situation text;

alter table public.managers add column if not exists stripe_customer_id     text;
alter table public.managers add column if not exists stripe_subscription_id text;

-- success_fees now records the Free-plan unlock (A$99 + GST, paid by card through Stripe).
alter table public.success_fees drop constraint if exists success_fees_status_check;
alter table public.success_fees add constraint success_fees_status_check
  check (status in ('awaiting_unlock', 'paid', 'expired', 'waived', 'owed', 'invoiced'));
alter table public.success_fees alter column status set default 'awaiting_unlock';
alter table public.success_fees add column if not exists stripe_session_id text;
alter table public.success_fees add column if not exists expires_at timestamptz;
alter table public.success_fees add column if not exists owner_notified_at timestamptz;

notify pgrst, 'reload schema';
