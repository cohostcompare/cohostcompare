-- CoHostCompare 013: founding offer is now 3 months (claim by 31 Jan 2027), and Enterprise enquiries.
-- Run once in Supabase after 012: SQL Editor -> New query -> paste -> Run.

-- If 012 already gave founding managers 6 months, bring them back to 3.
update public.managers set pro_until = pro_until - interval '3 months'
where pro_note = 'founding' and pro_until > now() + interval '3 months 1 day';

-- Allow Enterprise enquiries in interest sign-ups.
alter table public.interest_signups drop constraint if exists interest_signups_kind_check;
alter table public.interest_signups add constraint interest_signups_kind_check check (kind in ('pro', 'report', 'partner', 'enterprise'));

notify pgrst, 'reload schema';
