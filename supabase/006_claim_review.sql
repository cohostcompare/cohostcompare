-- CoHostCompare: admin review of claims (run once in Supabase: SQL Editor -> New query -> Run)

alter table public.manager_claims drop constraint if exists manager_claims_status_check;
alter table public.manager_claims add constraint manager_claims_status_check
  check (status in ('pending', 'info_requested', 'approved', 'rejected'));
alter table public.manager_claims add column if not exists admin_note text;
alter table public.manager_claims add column if not exists info_request text;
