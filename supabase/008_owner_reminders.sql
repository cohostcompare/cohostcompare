-- CoHostCompare: owner quote reminders and fair comparisons (run once in Supabase: SQL Editor -> New query -> Run)

-- Property location, so the comparison can show each manager's track record near this address
alter table public.quote_requests add column if not exists lat double precision;
alter table public.quote_requests add column if not exists lng double precision;
-- When we told the owner every manager has replied (sent once per request)
alter table public.quote_requests add column if not exists all_replied_at timestamptz;

-- When the owner first saw this manager's quote, and when we last nudged each side
alter table public.quote_request_managers add column if not exists owner_seen_at timestamptz;
alter table public.quote_request_managers add column if not exists owner_reminded_at timestamptz;
alter table public.quote_request_managers add column if not exists manager_reminded_at timestamptz;
