-- CoHostCompare 021: manager requirements (what properties they take on) and how much of the year an owner's property is available.
-- Run once in Supabase after 020: SQL Editor -> New query -> paste -> Run.

alter table public.managers add column if not exists requirements jsonb;
alter table public.quote_requests add column if not exists availability text;

notify pgrst, 'reload schema';
