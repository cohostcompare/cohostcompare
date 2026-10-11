-- CoHostCompare 031: quote requests filled in before signing in.
-- An owner can complete the whole quote form without an account. The request is held here, we email a sign-in
-- link, and when they open it (/quote/send/[id]) the request goes out under their new session. Safe to run again.
create table if not exists public.pending_requests (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  fields      jsonb not null,          -- the validated form, as sent by src/app/quote/actions.ts
  created_at  timestamptz not null default now(),
  sent_at     timestamptz,
  request_id  uuid
);
alter table public.pending_requests enable row level security;
create index if not exists pending_requests_created_idx on public.pending_requests (created_at);

notify pgrst, 'reload schema';
