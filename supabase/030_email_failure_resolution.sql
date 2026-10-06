-- CoHostCompare 030: email failures can be resolved from /admin (dismissed, retried, email replaced, manager hidden).
-- Applied 7 Oct 2026. Safe to run again.
alter table public.email_failures add column if not exists resolved_at timestamptz;
alter table public.email_failures add column if not exists resolution text; -- 'dismissed' | 'retry' | 'replaced' | 'hidden'

notify pgrst, 'reload schema';
