-- CoHostCompare 017: ad results, owner reviews of managers, review invites, partner offers, site settings.
-- Run once in Supabase after 016: SQL Editor -> New query -> paste -> Run.
-- Everything here is read and written by the server only (secret key), so RLS is on with no public policies.

-- 1. Where visitors come from (no personal details: a random session id, the source and the landing page).
create table if not exists public.funnel_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  sid         text not null,
  kind        text not null check (kind in ('visit', 'search', 'quote')),
  source      text not null default 'direct' check (source in ('ads', 'google', 'social', 'referral', 'email', 'direct')),
  campaign    text,
  landing     text
);
create index if not exists funnel_events_created_idx on public.funnel_events (created_at desc);
create index if not exists funnel_events_sid_idx on public.funnel_events (sid);
alter table public.funnel_events enable row level security;

alter table public.quote_requests add column if not exists source   text;
alter table public.quote_requests add column if not exists campaign text;
alter table public.quote_requests add column if not exists review_invited_at timestamptz;

-- 2. Owner reviews of managers. Only owners who accepted that manager's quote can review, once per quote.
create table if not exists public.manager_reviews (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  thread_id      uuid not null unique references public.quote_request_managers (id) on delete cascade,
  manager_slug   text not null,
  owner_id       uuid not null references auth.users (id) on delete cascade,
  owner_first    text,
  suburb         text,
  rating         int not null check (rating between 1 and 5),
  body           text not null,
  status         text not null default 'published' check (status in ('published', 'hidden')),
  hidden_reason  text,
  manager_reply  text,
  replied_at     timestamptz
);
create index if not exists manager_reviews_slug_idx on public.manager_reviews (manager_slug, status);
alter table public.manager_reviews enable row level security;

-- 3. Partner offers for owners (insurance, cleaning, photography, furnishing...).
create table if not exists public.partners (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  name           text not null,
  contact_name   text,
  email          text not null,
  phone          text,
  website        text,
  category       text not null,
  areas          text,
  offer_title    text,
  offer_body     text,
  offer_url      text,
  promo_code     text,
  logo_url       text,
  referral_fee   boolean not null default false,
  admin_note     text,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'hidden', 'rejected')),
  sort           int not null default 100
);
create index if not exists partners_status_idx on public.partners (status, sort);
alter table public.partners enable row level security;

create table if not exists public.partner_clicks (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  partner_id  uuid not null references public.partners (id) on delete cascade
);
create index if not exists partner_clicks_partner_idx on public.partner_clicks (partner_id, created_at desc);
alter table public.partner_clicks enable row level security;

-- 4. Simple on/off switches set from admin (e.g. showing partner offers on /setup).
create table if not exists public.site_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.site_settings enable row level security;
insert into public.site_settings (key, value) values ('offers_live', 'false'::jsonb) on conflict (key) do nothing;

notify pgrst, 'reload schema';
