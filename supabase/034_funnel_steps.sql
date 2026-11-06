-- CoHostCompare 034: quote-flow steps and an AI-assistant traffic source in funnel_events.
-- Run once in Supabase after 033: SQL Editor -> New query -> paste -> Run.
-- New kinds, in funnel order: visit, search, details (property bar complete), pick (first manager added),
-- form (quote form opened), held (signed-out request held, email link sent), link (email link opened), quote (request sent).
-- New source: ai (ChatGPT, Perplexity, Copilot, Gemini, Claude...).
alter table public.funnel_events drop constraint if exists funnel_events_kind_check;
alter table public.funnel_events add constraint funnel_events_kind_check
  check (kind in ('visit', 'search', 'details', 'pick', 'form', 'held', 'link', 'quote'));
alter table public.funnel_events drop constraint if exists funnel_events_source_check;
alter table public.funnel_events add constraint funnel_events_source_check
  check (source in ('ads', 'google', 'ai', 'social', 'referral', 'email', 'direct'));
create index if not exists funnel_events_sid_kind_idx on public.funnel_events (sid, kind);
