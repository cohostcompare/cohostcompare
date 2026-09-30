-- CoHostCompare: profile editing, photos, quotes, claim reminders (run once in Supabase: SQL Editor -> New query -> Run)

-- Profile media and extra fields managers can edit
alter table public.managers add column if not exists logo_url text;
alter table public.managers add column if not exists photos text[] not null default '{}';
alter table public.managers add column if not exists contact_phone text;

-- A record of every profile edit
create table if not exists public.manager_edits (
  id          uuid primary key default gen_random_uuid(),
  manager_id  uuid not null references public.managers (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  changes     jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.manager_edits enable row level security;

-- Claim reminders: when the status last changed
alter table public.manager_claims add column if not exists status_changed_at timestamptz not null default now();
alter table public.manager_claims drop constraint if exists manager_claims_status_check;
alter table public.manager_claims add constraint manager_claims_status_check
  check (status in ('pending', 'info_requested', 'info_received', 'approved', 'rejected'));

create or replace function public.claims_touch_status() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then new.status_changed_at := now(); end if;
  return new;
end $$;
drop trigger if exists claims_touch_status on public.manager_claims;
create trigger claims_touch_status before update on public.manager_claims
  for each row execute function public.claims_touch_status();

-- Quotes: when the owner accepted, and the manager's quote timestamp
alter table public.quote_request_managers add column if not exists quoted_at timestamptz;
alter table public.quote_request_managers add column if not exists accepted_at timestamptz;

-- Public storage for manager logos and photos (uploads happen through the website's server only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manager-media', 'manager-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
