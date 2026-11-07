-- CoHostCompare 035: keep hotel-style operators out of the top 3 and ranking pages without hiding them.
-- Run once in Supabase after 034 (applied 7 Nov 2026 via the connector).
alter table public.managers add column if not exists rank_flag text;
comment on column public.managers.rank_flag is 'Admin reason to keep this manager out of the top 3 and ranking pages (e.g. hotel). Null = no manual flag. Never hides the profile.';
