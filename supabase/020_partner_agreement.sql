-- CoHostCompare 020: partner agreement acceptance.
-- Run once in Supabase after 019: SQL Editor -> New query -> paste -> Run.

alter table public.partners add column if not exists fee_terms       text;        -- commercial terms agreed with the partner, shown before they accept
alter table public.partners add column if not exists agreed_at       timestamptz;
alter table public.partners add column if not exists agreed_version  text;
alter table public.partners add column if not exists agreed_name     text;        -- name typed when accepting
alter table public.partners add column if not exists agreed_ip_hash  text;

notify pgrst, 'reload schema';
