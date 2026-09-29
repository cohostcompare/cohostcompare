-- CoHostCompare waitlist table
-- Paste into Supabase: SQL Editor -> New query -> Run.
-- The public website can ADD sign-ups but can never read, change or delete them.

create table if not exists public.waitlist (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  type        text not null check (type in ('owner', 'manager')),
  email       text not null check (char_length(email) between 3 and 254),
  postcode    text check (postcode ~ '^[0-9]{4}$'),
  stage       text check (char_length(stage) <= 60),
  business    text check (char_length(business) <= 160),
  postcodes   text check (char_length(postcodes) <= 300),
  properties  text check (char_length(properties) <= 20),
  source      text check (char_length(source) <= 120)
);

alter table public.waitlist enable row level security;

grant insert on public.waitlist to anon;

drop policy if exists "Anyone can join the waitlist" on public.waitlist;
create policy "Anyone can join the waitlist"
  on public.waitlist
  for insert
  to anon
  with check (true);

-- No select/update/delete policies: sign-ups are only visible to you in the Supabase dashboard (Table Editor -> waitlist).
