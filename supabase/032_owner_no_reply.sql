-- CoHostCompare 032: tell owners when a manager hasn't replied.
-- Set once per thread when the owner has been emailed that this manager hasn't replied after NO_REPLY_DAYS
-- (src/lib/ownerJobs.ts noReplyFollowUps), with other managers covering the property or, if none, an offer
-- to email them when one starts. Safe to run again.
alter table public.quote_request_managers add column if not exists owner_no_reply_at timestamptz;

notify pgrst, 'reload schema';
