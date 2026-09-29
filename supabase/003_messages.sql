-- CoHostCompare: address fields + owner/manager messages (run once in Supabase: SQL Editor -> New query -> Run)

alter table public.quote_requests add column if not exists street text;
alter table public.quote_requests add column if not exists suburb text;
alter table public.quote_requests add column if not exists state  text;

-- One conversation per owner-manager pair (a quote_request_managers row)
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.quote_request_managers (id) on delete cascade,
  sender      text not null check (sender in ('owner', 'manager', 'system')),
  body        text not null check (char_length(body) between 1 and 4000),
  created_at  timestamptz not null default now(),
  read_by_owner   boolean not null default false,
  read_by_manager boolean not null default false
);
create index if not exists messages_thread_idx on public.messages (thread_id, created_at);

alter table public.messages enable row level security;
grant select on public.messages to authenticated;

drop policy if exists "Owners read their messages" on public.messages;
create policy "Owners read their messages" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.quote_request_managers t
      join public.quote_requests r on r.id = t.request_id
      where t.id = thread_id and r.owner_id = auth.uid()
    )
  );
