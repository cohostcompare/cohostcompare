-- CoHostCompare 018: feedback from owners and managers, with a thank-you reward.
-- Run once in Supabase after 017: SQL Editor -> New query -> paste -> Run.

create table if not exists public.feedback (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  user_id        uuid references auth.users (id) on delete set null,
  email          text,
  role           text not null check (role in ('owner', 'manager', 'visitor')),
  manager_id     uuid references public.managers (id) on delete set null,
  ease           int check (ease between 1 and 5),
  nps            int check (nps between 0 and 10),
  improve        text,
  confusing      text,
  wish           text,
  heard_from     text,
  contact_ok     boolean not null default false,
  page           text,
  reward         text,
  reward_status  text not null default 'none' check (reward_status in ('none', 'granted', 'to_send', 'sent', 'manual')),
  admin_note     text
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_user_idx on public.feedback (user_id);
alter table public.feedback enable row level security;

-- When we've asked someone, so the pop-up stays rare.
create table if not exists public.feedback_prompts (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  shown_count    int not null default 0,
  last_shown_at  timestamptz,
  snoozed_until  timestamptz,
  dismissed_at   timestamptz
);
alter table public.feedback_prompts enable row level security;

notify pgrst, 'reload schema';
